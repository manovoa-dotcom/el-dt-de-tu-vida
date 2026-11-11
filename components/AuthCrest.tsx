import Image from "next/image";

export default function AuthCrest({ className }: { className: string }) {
  return (
    <Image
      src="/icons/login-crest.png"
      alt="Escudo de El DT de tu vida"
      width={1024}
      height={1024}
      priority
      className={className}
    />
  );
}
