import React from "react";

interface BreakdownStrategyProps {
    strategy: string[];
}

const BreakdownStrategy = ({ strategy }: BreakdownStrategyProps) => {
    return (
        <div className="flex flex-col flex-1 gap-6 mx-auto mt-10 items-center">
            {strategy.map((step, index) => (
                <div
                    key={index}
                    className="flex md:flex-row flex-col justify-center items-center max-w-[250px] sm:max-w-none gap-3 text-xl md:text-md font-rounded-bold text-center animate-fade-in"
                    style={{
                        animationDelay: `${index * 300}ms`,
                        opacity: 0,
                        animationFillMode: 'forwards'
                    }}
                >
                    <p className="inline-flex items-center justify-center text-white rounded-full w-6 h-6 bg-[#05B0FF] text-[16px]">
                        {index + 1}
                    </p>
                    <p>{step}</p>
                </div>
            ))}
        </div>
    );
};

export default BreakdownStrategy; 