import { TbSocialOff } from "react-icons/tb";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  iconOnly?: boolean;
}

export const Logo = ({ iconOnly = false }: LogoProps) => (
  <Link href="/project" className={`font-bold text-primary flex items-center ${iconOnly ? 'gap-0' : 'gap-3 text-xl'}`}>
    <Image src="/logo-transparent.png" width="100" height="100" alt="NextPostAi" className="size-6" />
    {!iconOnly && <span>NextPostAI</span>}
  </Link>
);
