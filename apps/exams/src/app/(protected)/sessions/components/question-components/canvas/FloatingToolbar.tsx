import React from 'react';

interface FloatingToolbarProps {
    type: 'math' | 'chem';
    onMultiplicationClick: () => void;
    onDivisionClick: () => void;
    onSuperscriptClick: () => void;
    onSubscriptClick: () => void;
    onFractionClick: () => void;
    onSquareRootClick: () => void;
    onRightArrowClick: () => void;
    onRightLeftHarpoonsClick: () => void;
    onRecurringDecimalClick: () => void;
    onIntegrationClick: () => void;
    onDifferentiationClick: () => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
    type = 'math',
    onMultiplicationClick,
    onDivisionClick,
    onSuperscriptClick,
    onSubscriptClick,
    onFractionClick,
    onSquareRootClick,
    onRightArrowClick,
    onRightLeftHarpoonsClick,
    onRecurringDecimalClick,
    onIntegrationClick,
    onDifferentiationClick,
}) => {
    const toolbarHeight = 30; // Approximate height for positioning
    const spacing = 16; // Space above the textbox

    // Prevent default mousedown behavior (focus shift)
    const handleMouseDown = (e: React.MouseEvent, operator: string) => {
        if (operator === "multiplication") {
            onMultiplicationClick();
        } else if (operator === "division") {
            onDivisionClick();
        } else if (operator === "superscript") {
            onSuperscriptClick();
        } else if (operator === "subscript") {
            onSubscriptClick();
        } else if (operator === "fraction") {
            onFractionClick();
        } else if (operator === "sqrt") {
            onSquareRootClick();
        } else if (operator === "rightArrow") {
            onRightArrowClick();
        } else if (operator === "rightLeftHarpoons") {
            onRightLeftHarpoonsClick();
        } else if (operator === "recurringDecimal") {
            onRecurringDecimalClick();
        } else if (operator === "integration") {
            onIntegrationClick();
        } else if (operator === "differentiation") {
            onDifferentiationClick();
        }
        e.preventDefault();
    };

    return (
        <div
            className="absolute flex gap-1 bg-white border border-[#F2F2F7/10] rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] px-2 py-1"
            style={{
                // Position it above the parent (textbox wrapper)
                top: '0px',
                left: '-16px',
                zIndex: 15, // Ensure it's above the textbox border but potentially below the main toolbar
            }}
            // Prevent clicks on the toolbar from propagating to the canvas/textbox
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()} // Also stop mousedown propagation on the container
            onDoubleClick={(e) => e.stopPropagation()}
        >
            {type == 'chem' &&
                (<div className='flex flex-row items-center'>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "superscript")}
                    // Add onClick for actual formatting later
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.4082 12H22.5918C23.5206 12 24 11.5206 24 10.6046V5.3954C24 4.4794 23.5206 4 22.5918 4H17.4082C16.4837 4 16 4.47512 16 5.3954V10.6046C16 11.5206 16.4837 12 17.4082 12Z" fill="#1C1C1E" />
                            <path d="M6.7603 19H13.2397C14.4007 19 15 18.4007 15 17.2558V10.7442C15 9.59925 14.4007 9 13.2397 9H6.7603C5.6046 9 5 9.5939 5 10.7442V17.2558C5 18.4007 5.6046 19 6.7603 19ZM6.82986 17.9353C6.33761 17.9353 6.06474 17.6784 6.06474 17.1594V10.8406C6.06474 10.3216 6.33761 10.0647 6.82986 10.0647H13.1701C13.657 10.0647 13.9353 10.3216 13.9353 10.8406V17.1594C13.9353 17.6784 13.657 17.9353 13.1701 17.9353H6.82986Z" fill="#1C1C1E" />
                        </svg>
                    </button>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "subscript")}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.4082 24H22.5918C23.5206 24 24 23.5206 24 22.6046V17.3954C24 16.4794 23.5206 16 22.5918 16H17.4082C16.4837 16 16 16.4751 16 17.3954V22.6046C16 23.5206 16.4837 24 17.4082 24Z" fill="#1C1C1E" />
                            <path d="M6.7603 19H13.2397C14.4007 19 15 18.4007 15 17.2558V10.7442C15 9.59925 14.4007 9 13.2397 9H6.7603C5.6046 9 5 9.5939 5 10.7442V17.2558C5 18.4007 5.6046 19 6.7603 19ZM6.82986 17.9353C6.33761 17.9353 6.06474 17.6784 6.06474 17.1594V10.8406C6.06474 10.3216 6.33761 10.0647 6.82986 10.0647H13.1701C13.657 10.0647 13.9353 10.3216 13.9353 10.8406V17.1594C13.9353 17.6784 13.657 17.9353 13.1701 17.9353H6.82986Z" fill="#1C1C1E" />
                        </svg>
                    </button>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "rightArrow")}
                    >
                        <svg width="28" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.3145 13.6455C22.3145 13.373 22.2002 13.1094 21.998 12.916L16.2236 7.1416C15.9951 6.92188 15.7578 6.8252 15.5117 6.8252C14.9492 6.8252 14.5449 7.2207 14.5449 7.75684C14.5449 8.03809 14.6592 8.27539 14.835 8.45117L16.8125 10.4551L19.3613 12.7842L17.3223 12.6611H6.66992C6.08105 12.6611 5.67676 13.0654 5.67676 13.6455C5.67676 14.2168 6.08105 14.6211 6.66992 14.6211H17.3223L19.3613 14.498L16.8125 16.8271L14.835 18.8311C14.6592 19.0068 14.5449 19.2441 14.5449 19.5254C14.5449 20.0615 14.9492 20.457 15.5117 20.457C15.7578 20.457 15.9951 20.3604 16.2061 20.1582L21.998 14.3662C22.2002 14.1729 22.3145 13.9092 22.3145 13.6455Z" fill="#1C1C1E" />
                        </svg>
                    </button>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "rightLeftHarpoons")}
                    >
                        <svg width="28" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.71191 7.84473C5.29883 8.24023 5.30762 8.85547 5.71191 9.24219L10.2471 13.6719C10.4229 13.8477 10.6953 13.9619 10.9326 13.9619C11.4863 13.9619 11.8643 13.5752 11.8643 13.0303C11.8643 12.7666 11.7764 12.5557 11.5918 12.3799L9.71094 10.5693L8.375 9.40918L10.2383 9.47949H21.6465C22.1914 9.47949 22.5869 9.08398 22.5869 8.53906C22.5869 7.99414 22.1914 7.60742 21.6465 7.60742H10.2383L8.375 7.66895L9.71094 6.51758L11.5918 4.70703C11.7764 4.53125 11.8643 4.31152 11.8643 4.04785C11.8643 3.51172 11.4863 3.125 10.9326 3.125C10.6953 3.125 10.4229 3.23926 10.2471 3.41504L5.71191 7.84473ZM22.2793 19.4814C22.6924 19.0859 22.6836 18.4707 22.2793 18.084L17.7529 13.6543C17.5684 13.4785 17.2959 13.3643 17.0586 13.3643C16.5137 13.3643 16.1357 13.751 16.1357 14.2959C16.1357 14.5508 16.2236 14.7705 16.3994 14.9463L18.2803 16.7568L19.6162 17.9082L17.7529 17.8467H6.34473C5.80859 17.8467 5.4043 18.2422 5.4043 18.7871C5.4043 19.3232 5.80859 19.7188 6.34473 19.7188H17.7529L19.6162 19.6572L18.2803 20.8086L16.3994 22.6191C16.2236 22.7949 16.1357 23.0146 16.1357 23.2695C16.1357 23.8145 16.5137 24.2012 17.0586 24.2012C17.2959 24.2012 17.5684 24.0869 17.7529 23.9111L22.2793 19.4814Z" fill="#1C1C1E" />
                        </svg>
                    </button>

                    <div className='w-1 h-[80%] border-r border-[#F2F2F7] pr-2' />
                </div>)}

            <button
                className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                onMouseDown={(e) => handleMouseDown(e, "multiplication")}
            // Add onClick for actual formatting later
            >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.31348 17.9346C7.94434 18.3037 7.92676 18.9629 8.32227 19.3408C8.7002 19.7363 9.36817 19.7188 9.73731 19.3496L14 15.0869L18.2627 19.3496C18.6406 19.7275 19.291 19.7363 19.6689 19.3408C20.0645 18.9629 20.0557 18.3037 19.6777 17.9258L15.415 13.6631L19.6777 9.40918C20.0557 9.02246 20.0645 8.37207 19.6689 7.99414C19.291 7.59863 18.6406 7.60742 18.2627 7.98535L14 12.248L9.73731 7.98535C9.36817 7.61621 8.7002 7.59863 8.32227 7.99414C7.92676 8.37207 7.94434 9.03125 8.31348 9.40039L12.5762 13.6631L8.31348 17.9346Z" fill="#1C1C1E" />
                </svg>
            </button>
            <button
                className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                onMouseDown={(e) => handleMouseDown(e, "division")}
            // Add onClick for actual formatting later
            >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 9.96289C14.8086 9.96289 15.4678 9.33008 15.4678 8.52148C15.4678 7.7041 14.8086 7.0625 14 7.0625C13.1914 7.0625 12.541 7.7041 12.541 8.52148C12.541 9.33008 13.1914 9.96289 14 9.96289ZM7.63672 14.665H20.3633C20.8994 14.665 21.3564 14.2168 21.3564 13.6631C21.3564 13.1182 20.8994 12.6611 20.3633 12.6611H7.63672C7.11816 12.6611 6.64355 13.1182 6.64355 13.6631C6.64355 14.2168 7.11816 14.665 7.63672 14.665ZM14 20.3516C14.8086 20.3516 15.4678 19.7188 15.4678 18.9014C15.4678 18.0928 14.8086 17.4512 14 17.4512C13.1914 17.4512 12.541 18.0928 12.541 18.9014C12.541 19.7188 13.1914 20.3516 14 20.3516Z" fill="#1C1C1E" />
                </svg>
            </button>

            {type == 'math' &&
                (<>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "superscript")}
                    // Add onClick for actual formatting later
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.4082 12H22.5918C23.5206 12 24 11.5206 24 10.6046V5.3954C24 4.4794 23.5206 4 22.5918 4H17.4082C16.4837 4 16 4.47512 16 5.3954V10.6046C16 11.5206 16.4837 12 17.4082 12Z" fill="#1C1C1E" />
                            <path d="M6.7603 19H13.2397C14.4007 19 15 18.4007 15 17.2558V10.7442C15 9.59925 14.4007 9 13.2397 9H6.7603C5.6046 9 5 9.5939 5 10.7442V17.2558C5 18.4007 5.6046 19 6.7603 19ZM6.82986 17.9353C6.33761 17.9353 6.06474 17.6784 6.06474 17.1594V10.8406C6.06474 10.3216 6.33761 10.0647 6.82986 10.0647H13.1701C13.657 10.0647 13.9353 10.3216 13.9353 10.8406V17.1594C13.9353 17.6784 13.657 17.9353 13.1701 17.9353H6.82986Z" fill="#1C1C1E" />
                        </svg>
                    </button>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "subscript")}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.4082 24H22.5918C23.5206 24 24 23.5206 24 22.6046V17.3954C24 16.4794 23.5206 16 22.5918 16H17.4082C16.4837 16 16 16.4751 16 17.3954V22.6046C16 23.5206 16.4837 24 17.4082 24Z" fill="#1C1C1E" />
                            <path d="M6.7603 19H13.2397C14.4007 19 15 18.4007 15 17.2558V10.7442C15 9.59925 14.4007 9 13.2397 9H6.7603C5.6046 9 5 9.5939 5 10.7442V17.2558C5 18.4007 5.6046 19 6.7603 19ZM6.82986 17.9353C6.33761 17.9353 6.06474 17.6784 6.06474 17.1594V10.8406C6.06474 10.3216 6.33761 10.0647 6.82986 10.0647H13.1701C13.657 10.0647 13.9353 10.3216 13.9353 10.8406V17.1594C13.9353 17.6784 13.657 17.9353 13.1701 17.9353H6.82986Z" fill="#1C1C1E" />
                        </svg>
                    </button>
                </>)}

            <button
                className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                onMouseDown={(e) => handleMouseDown(e, "fraction")}
            >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.63672 14.665H20.3633C20.8994 14.665 21.3564 14.2168 21.3564 13.6631C21.3564 13.1182 20.8994 12.6611 20.3633 12.6611H7.63672C7.11816 12.6611 6.64355 13.1182 6.64355 13.6631C6.64355 14.2168 7.11816 14.665 7.63672 14.665Z" fill="#1C1C1E" />
                    <path d="M11.4082 11H16.5918C17.5206 11 18 10.5206 18 9.6046V4.3954C18 3.4794 17.5206 3 16.5918 3H11.4082C10.4837 3 10 3.47512 10 4.3954V9.6046C10 10.5206 10.4837 11 11.4082 11Z" fill="#1C1C1E" />
                    <path d="M11.4082 24H16.5918C17.5206 24 18 23.5206 18 22.6046V17.3954C18 16.4794 17.5206 16 16.5918 16H11.4082C10.4837 16 10 16.4751 10 17.3954V22.6046C10 23.5206 10.4837 24 11.4082 24Z" fill="#1C1C1E" />
                </svg>
            </button>
            <button
                className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                onMouseDown={(e) => handleMouseDown(e, "sqrt")}
            >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.98828 21.4326C9.02539 21.4326 9.54395 20.7734 9.84277 19.8682L13.666 7.73926H22.6221C23.2373 7.73926 23.6504 7.34375 23.6504 6.75488C23.6504 6.1748 23.2373 5.78809 22.6221 5.78809H13.6133C12.5146 5.78809 12.0225 6.20996 11.7236 7.17676L8.11133 19.0156H7.92676L6.35352 13.4785C6.19531 12.9072 5.8877 12.626 5.35156 12.626C4.7627 12.626 4.34961 13.0391 4.34961 13.584C4.34961 13.7949 4.39355 13.9707 4.45508 14.1641L6.23047 19.9385C6.51172 20.8262 7.02148 21.4326 7.98828 21.4326Z" fill="#1C1C1E" />
                    <path d="M16.4082 19H21.5918C22.5206 19 23 18.5206 23 17.6046V12.3954C23 11.4794 22.5206 11 21.5918 11H16.4082C15.4837 11 15 11.4751 15 12.3954V17.6046C15 18.5206 15.4837 19 16.4082 19Z" fill="#1C1C1E" />
                </svg>
            </button>

            {type == 'math' &&
                (<>
                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "recurringDecimal")}
                    // Add onClick for actual formatting later
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.7603 19H17.2397C18.4007 19 19 18.4007 19 17.2558V10.7442C19 9.59925 18.4007 9 17.2397 9H10.7603C9.6046 9 9 9.5939 9 10.7442V17.2558C9 18.4007 9.6046 19 10.7603 19ZM10.8299 17.9353C10.3376 17.9353 10.0647 17.6784 10.0647 17.1594V10.8406C10.0647 10.3216 10.3376 10.0647 10.8299 10.0647H17.1701C17.657 10.0647 17.9353 10.3216 17.9353 10.8406V17.1594C17.9353 17.6784 17.657 17.9353 17.1701 17.9353H10.8299Z" fill="#1C1C1E" />
                            <path d="M15.4678 5.45898C15.4678 6.26758 14.8086 6.90039 14 6.90039C13.1914 6.90039 12.541 6.26758 12.541 5.45898C12.541 4.6416 13.1914 4 14 4C14.8086 4 15.4678 4.6416 15.4678 5.45898Z" fill="#1C1C1E" />
                        </svg>

                    </button>

                    <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "integration")}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 21.7872C5 21.4743 5.09984 21.221 5.29951 21.0273C5.49918 20.8336 5.74206 20.7367 6.02816 20.7367C6.31426 20.7367 6.55863 20.8365 6.76129 21.0362C6.96096 21.2389 7.06079 21.4832 7.06079 21.7693C7.06079 22.0256 6.98182 22.2462 6.82387 22.4309C6.66592 22.6187 6.46625 22.7334 6.22485 22.7751L6.09522 22.8198C6.09522 22.8467 6.12651 22.8958 6.18909 22.9674C6.25466 23.0389 6.3083 23.0821 6.35002 23.097C6.53777 23.24 6.73894 23.2549 6.95351 23.1417C7.15318 23.0553 7.32454 22.8407 7.46759 22.498C7.68216 22.0122 7.91164 20.5177 8.15601 18.0143C8.34078 16.0951 8.55536 14.3278 8.79973 12.7126C9.14245 10.394 9.46431 8.55521 9.76531 7.19624C10.1647 5.29489 10.8859 4.23692 11.9289 4.02235C12.0004 4.00745 12.1018 4 12.2329 4C12.8617 4 13.34 4.32186 13.6679 4.96558C13.8556 5.37982 13.9495 5.79556 13.9495 6.21278C13.9495 6.5257 13.8482 6.77902 13.6455 6.97273C13.4458 7.16644 13.2029 7.2633 12.9169 7.2633C12.6308 7.2633 12.3879 7.16346 12.1882 6.96379C11.9885 6.76114 11.8887 6.51676 11.8887 6.23067C11.8887 5.97437 11.9677 5.75384 12.1256 5.56906C12.2806 5.38131 12.4803 5.26658 12.7246 5.22485L12.8543 5.18015C12.8543 5.15333 12.8215 5.10416 12.7559 5.03263C12.6933 4.96111 12.6397 4.9179 12.595 4.90299C12.4102 4.75995 12.2031 4.75249 11.9736 4.88064C11.7173 5.00879 11.5102 5.38131 11.3523 5.99821C11.2241 6.48398 11.0453 7.80718 10.8158 9.96781C10.4731 13.5858 9.95008 17.1262 9.24676 20.5892C8.99046 21.8766 8.61943 22.799 8.13366 23.3563C7.74624 23.7407 7.29474 23.9553 6.77917 24C6.22187 24 5.78677 23.7854 5.47385 23.3563C5.15795 22.9271 5 22.4041 5 21.7872Z" fill="black" />
                            <path d="M15.4082 19H20.5918C21.5206 19 22 18.5206 22 17.6046V12.3954C22 11.4794 21.5206 11 20.5918 11H15.4082C14.4837 11 14 11.4751 14 12.3954V17.6046C14 18.5206 14.4837 19 15.4082 19Z" fill="#1C1C1E" />
                        </svg>

                    </button>

                    {/* <button
                        className=" text-sm hover:bg-[#F2F2F7] rounded-[6px] p-0.5"
                        onMouseDown={(e) => handleMouseDown(e, "differentiation")}
                    >
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 8.5C6 7.67157 6.67157 7 7.5 7H9.5C10.3284 7 11 7.67157 11 8.5C11 9.32843 10.3284 10 9.5 10H8V11H9.5C10.3284 11 11 11.6716 11 12.5C11 13.3284 10.3284 14 9.5 14H7.5C6.67157 14 6 13.3284 6 12.5V8.5ZM8 12V13H9.5C9.77614 13 10 12.7761 10 12.5C10 12.2239 9.77614 12 9.5 12H8ZM8 8V9H9.5C9.77614 9 10 8.77614 10 8.5C10 8.22386 9.77614 8 9.5 8H8Z" fill="#1C1C1E" />
                            <path d="M13 7C13 6.44772 13.4477 6 14 6C14.5523 6 15 6.44772 15 7V11H18C18.5523 11 19 11.4477 19 12C19 12.5523 18.5523 13 18 13H15V14C15 14.5523 14.5523 15 14 15C13.4477 15 13 14.5523 13 14V7Z" fill="#1C1C1E" />
                            <path d="M6 18.5C6 17.6716 6.67157 17 7.5 17H9.5C10.3284 17 11 17.6716 11 18.5C11 19.3284 10.3284 20 9.5 20H8V21H9.5C10.3284 21 11 21.6716 11 22.5C11 23.3284 10.3284 24 9.5 24H7.5C6.67157 24 6 23.3284 6 22.5V18.5ZM8 22V23H9.5C9.77614 23 10 22.7761 10 22.5C10 22.2239 9.77614 22 9.5 22H8ZM8 18V19H9.5C9.77614 19 10 18.7761 10 18.5C10 18.2239 9.77614 18 9.5 18H8Z" fill="#1C1C1E" />
                            <path d="M14 17C14.5523 17 15 17.4477 15 18V20H17V18C17 17.4477 17.4477 17 18 17C18.5523 17 19 17.4477 19 18V20H21C21.5523 20 22 20.4477 22 21C22 21.5523 21.5523 22 21 22H19V24C19 24.5523 18.5523 25 18 25C17.4477 25 17 24.5523 17 24V22H15V24C15 24.5523 14.5523 25 14 25C13.4477 25 13 24.5523 13 24V18C13 17.4477 13.4477 17 14 17Z" fill="#1C1C1E" />
                        </svg>
                    </button> */}

                </>)}


        </div >
    );
};

export default FloatingToolbar; 