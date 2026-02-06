import { useCallback, useEffect } from 'react';

interface DesmosButtonDetectionOptions {
    containerRef: React.RefObject<HTMLElement | null>;
    enabled?: boolean;
    onButtonClick?: (selector: string, buttonText: string, element: HTMLElement) => void;
}

export const useDesmosButtonDetection = ({
    containerRef,
    enabled = true,
    onButtonClick
}: DesmosButtonDetectionOptions) => {
    // Default button selectors to detect
    const buttonSelectors = [
        '.dcg-add-expression-btn',
        '.dcg-add-regression-view',
        '.dcg-suggested-zoom-view',
        '.dcg-action-newtable',
        '.dcg-action-newexpression'
    ];

    // Handle button click with default logging and custom callback
    const handleButtonClick = useCallback((
        selector: string,
        buttonText: string,
        element: HTMLElement,
        eventType: string
    ) => {
        // console.log('🎯 Desmos Button Clicked:', {
        //     selector,
        //     buttonText,
        //     element,
        //     eventType,
        //     timestamp: new Date().toISOString()
        // });

        // Default logging for specific buttons
        if (selector === '.dcg-add-expression-btn') {
            // console.log('➕ Add Item button clicked');
        } else if (selector === '.dcg-add-regression-view') {
            // console.log('📈 Add Regression button clicked');
        } else if (selector === '.dcg-suggested-zoom-view') {
            // console.log('🔍 Suggested Zoom button clicked');
        } else if (selector === '.dcg-action-newtable') {
            // console.log('📊 New Table button clicked');
        } else if (selector === '.dcg-action-newexpression') {
            // console.log('📝 Add Expression button clicked');
        }

        // Call custom callback if provided
        onButtonClick?.(selector, buttonText, element);
    }, [onButtonClick]);

    // Event delegation handler
    const setupEventDelegation = useCallback(() => {
        const container = containerRef.current;
        if (!container) return () => { };

        const delegationHandler = (event: Event) => {
            const target = event.target as HTMLElement;

            // Check if the clicked element or its parent matches our selectors
            let matchedElement: HTMLElement | null = null;
            let matchedSelector: string | null = null;

            // Use for...of loop to allow proper breaking
            for (const selector of buttonSelectors) {
                // Check the target element itself
                if (target.matches && target.matches(selector)) {
                    matchedElement = target;
                    matchedSelector = selector;
                    break;
                }

                // Check parent elements up to 3 levels
                let parent: HTMLElement | null = target.parentElement;
                let level = 0;
                while (parent && level < 3) {
                    if (parent.matches && parent.matches(selector)) {
                        matchedElement = parent;
                        matchedSelector = selector;
                        break;
                    }
                    parent = parent.parentElement;
                    level++;
                }

                // If we found a match, break out of the outer loop too
                if (matchedElement) {
                    break;
                }
            }

            if (matchedElement && matchedSelector) {
                const buttonText = matchedElement.getAttribute('aria-label') ||
                    matchedElement.textContent?.trim() ||
                    'Unknown Button';

                handleButtonClick(matchedSelector, buttonText, matchedElement, event.type);
            }
        };

        // Add event delegation listeners to the container
        const eventTypes = ['click', 'mousedown', 'mouseup'];
        eventTypes.forEach(eventType => {
            container.addEventListener(eventType, delegationHandler, true);
        });

        // console.log('🎯 Event delegation setup for Desmos buttons');

        return () => {
            eventTypes.forEach(eventType => {
                container.removeEventListener(eventType, delegationHandler, true);
            });
            // console.log('🧹 Event delegation cleaned up for Desmos buttons');
        };
    }, [containerRef, handleButtonClick]);

    // Direct listener handler for existing buttons (backup)
    const attachDirectListeners = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        buttonSelectors.forEach(selector => {
            const buttons = container.querySelectorAll(selector);
            // console.log(`🔍 Found ${buttons.length} buttons for selector: ${selector}`);

            buttons.forEach((button, index) => {
                // console.log(`  Button ${index + 1}:`, {
                //     selector,
                //     element: button,
                //     ariaLabel: button.getAttribute('aria-label'),
                //     textContent: button.textContent?.trim(),
                //     hasHandler: !!(button as any).__desmosClickHandler
                // });

                // Check if we've already attached a listener to this button
                if (!(button as any).__desmosClickHandler) {
                    const clickHandler = (event: Event) => {
                        const buttonText = button.getAttribute('aria-label') ||
                            button.textContent?.trim() ||
                            'Unknown Button';

                        handleButtonClick(selector, buttonText, button as HTMLElement, event.type);
                    };

                    const eventTypes = ['click', 'mousedown', 'mouseup'];
                    eventTypes.forEach(eventType => {
                        try {
                            button.addEventListener(eventType, clickHandler, true);
                        } catch (e) {
                            // Some event types might not be valid, ignore errors
                        }
                    });

                    // Store the handler so we can remove it later if needed
                    (button as any).__desmosClickHandler = clickHandler;
                    (button as any).__desmosEventTypes = eventTypes;

                    // console.log(`✅ Direct click listeners added to ${selector}:`, button);
                }
            });
        });
    }, [containerRef, handleButtonClick]);

    // Main setup effect
    useEffect(() => {
        if (!enabled || !containerRef.current) return;

        // Small delay to ensure Desmos UI is fully rendered
        const timeoutId = setTimeout(() => {
            // Set up event delegation (primary method)
            const cleanupDelegation = setupEventDelegation();

            // Also attach direct listeners to existing buttons (backup method)
            attachDirectListeners();

            // Set up a MutationObserver to catch dynamically added buttons
            const observer = new MutationObserver((mutations) => {
                let shouldReattach = false;

                mutations.forEach((mutation) => {
                    // Check if any new nodes were added
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const element = node as Element;

                                // Check if the added node matches our selectors or contains matching elements
                                buttonSelectors.forEach(selector => {
                                    if (element.matches && element.matches(selector)) {
                                        shouldReattach = true;
                                    } else if (element.querySelector && element.querySelector(selector)) {
                                        shouldReattach = true;
                                    }
                                });
                            }
                        });
                    }
                });

                if (shouldReattach) {
                    // Small delay to ensure DOM is fully updated
                    setTimeout(attachDirectListeners, 100);
                }
            });

            if (containerRef.current) {
                // Start observing the Desmos container for changes
                observer.observe(containerRef.current, {
                    childList: true,
                    subtree: true
                });
            }

            // console.log('🔍 Desmos button click detection setup complete');

            // Cleanup function
            return () => {
                observer.disconnect();
                cleanupDelegation();

                // Remove all direct click listeners
                const container = containerRef.current;
                if (container) {
                    buttonSelectors.forEach(selector => {
                        const buttons = container.querySelectorAll(selector);
                        buttons.forEach((button) => {
                            const handler = (button as any).__desmosClickHandler;
                            const eventTypes = (button as any).__desmosEventTypes || ['click'];

                            if (handler) {
                                eventTypes.forEach((eventType: string) => {
                                    try {
                                        button.removeEventListener(eventType, handler, true);
                                    } catch (e) {
                                        // Ignore cleanup errors
                                    }
                                });
                                delete (button as any).__desmosClickHandler;
                                delete (button as any).__desmosEventTypes;
                            }
                        });
                    });
                }

                // console.log('🧹 Desmos button click detection cleaned up');
            };
        }, 500);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [enabled, containerRef, setupEventDelegation, attachDirectListeners]);
}; 