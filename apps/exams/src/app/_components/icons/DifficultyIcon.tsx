interface DifficultyIconProps {
    level?: "easy" | "medium" | "hard";
    width?: number;
    height?: number;
}

const DifficultyIcon = ({
    level = "easy",
    width = 28,
    height = 28,
}: DifficultyIconProps) => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.03271 21H8.40331C9.023 21 9.43614 20.5407 9.43614 19.8621V15.1745C9.43614 14.4959 9.023 14.047 8.40331 14.047H6.03271C5.41301 14.047 4.99988 14.4959 4.99988 15.1745V19.8621C4.99988 20.5407 5.41301 21 6.03271 21Z"
            fill={level === "easy" ? "#05B0FF" : "#05B0FF"} />
        <path d="M12.8988 21H15.2694C15.889 21 16.3022 20.5406 16.3022 19.8621V11.9172C16.3022 11.2386 15.889 10.7793 15.2694 10.7793H12.8988C12.2791 10.7793 11.866 11.2386 11.866 11.9172V19.8621C11.866 20.5406 12.2791 21 12.8988 21Z"
            fill={level === "medium" || level === "hard" ? "#05B0FF" : "#E0E0E2"} />
        <path d="M19.7549 21H22.1256C22.7452 21 23.1583 20.5406 23.1583 19.8621V8.13797C23.1583 7.45936 22.7452 7 22.1256 7H19.7549C19.1451 7 18.722 7.45936 18.722 8.13797V19.8621C18.722 20.5406 19.1451 21 19.7549 21Z"
            fill={level === "hard" ? "#05B0FF" : "#E0E0E2"} />
    </svg>
);

export default DifficultyIcon;


