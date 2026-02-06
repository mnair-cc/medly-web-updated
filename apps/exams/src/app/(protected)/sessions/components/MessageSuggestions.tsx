import React from "react";

interface MessageSuggestionsProps {
    suggestions: string[];
    onSuggestionClick: (suggestion: string) => void;
}

const MessageSuggestions: React.FC<MessageSuggestionsProps> = ({
    suggestions,
    onSuggestionClick,
}) => {
    return (
        <div className="w-full overflow-hidden">
            <div className="flex flex-col gap-2 scrollbar-hide">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSuggestionClick(suggestion)}
                        className="text-center text-wrap px-4 py-3 leading-tight font-rounded-semibold text-sm text-gray-700 bg-white border border-[#f2f2f7] rounded-full hover:bg-[#F2F2F7] transition-colors duration-200 whitespace-nowrap"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MessageSuggestions; 