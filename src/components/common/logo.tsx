import { TbSocialOff } from "react-icons/tb";
import Link from "next/link";

export const Logo = () => (
  <Link href="/" className="text-xl font-bold">
    <TbSocialOff className="inline-block mr-2" />
    NextPostAI
  </Link>
);