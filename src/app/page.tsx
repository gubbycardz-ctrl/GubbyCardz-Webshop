import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Image
        src="/brand/logo-wordmark.png"
        alt="GubbyCardz – Trading Cards & Merchandise"
        width={800}
        height={350}
        priority
        className="h-auto w-full max-w-xl"
      />
      <p className="max-w-md text-lg text-foreground/70">
        Unser Shop für <span className="font-semibold text-brand-red">Pokémon</span>- und{" "}
        <span className="font-semibold text-brand-blue">One Piece</span>-Karten ist bald für euch da.
      </p>
    </main>
  );
}
