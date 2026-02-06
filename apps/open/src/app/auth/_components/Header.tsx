import Link from "next/link";

interface HeaderProps {
  title: string;
  subtitle: {
    text: string;
    linkText?: string;
    linkHref?: string;
  };
}

export const Header = ({ title, subtitle }: HeaderProps) => (
  <div>
    <h2 className="text-center text-4xl font-rounded-bold mb-3">{title}</h2>
    <p className="text-center text-[14px] whitespace-pre-line leading-4">
      {subtitle.text}{" "}
      {subtitle.linkText && subtitle.linkHref && (
        <Link href={subtitle.linkHref} className="text-[#05afff]">
          {subtitle.linkText}
        </Link>
      )}
    </p>
  </div>
);
