import Link from "next/link";
import { useTracking } from "@/app/_lib/posthog/useTracking";

interface SidebarButtonFavoriteProps {
  title: string;
  href: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const SidebarButtonFavorite = ({
  title,
  href,
  icon,
  selected,
  onClick,
}: SidebarButtonFavoriteProps) => {
  const { track } = useTracking();
  return (
    <Link
      className={`cursor-pointer flex w-full py-3 ${
        title ? "justify-between px-4" : "justify-center"
      } items-center rounded-full text-sm font-medium ${
        selected
          ? "bg-[rgba(255,255,255,0.6)] text-black"
          : " text-black  hover:bg-[rgba(255,255,255,0.4)]"
      }`}
      href={href}
      onClick={(e) => {
        track("click_sidebar_button", {
          title,
          href,
        });
        onClick?.(e);
      }}
    >
      {title}
      {icon}
    </Link>
  );
};

export default SidebarButtonFavorite;
