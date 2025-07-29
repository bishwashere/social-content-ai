import { TbSocialOff } from "react-icons/tb";
import Link from "next/link";
import Image from "next/image";

export const Logo = () => (
  <Link href="/" className="text-xl font-bold text-primary flex items-center gap-3">
    <Image src="/logo.png" width="100" height="100" alt="NextPostAi" className="size-6" />
    NextPostAI
  </Link>
);
