import Link from "next/link";
import localFont from "next/font/local";

const caesar = localFont({
  src: "../../public/fonts/CaesarDressing-Regular.ttf",
});


export default function Navbar() {
  return (
    <div className="w-full bg-gradient-to-r from-[#0593D1] to-[#034B6B] text-white py-4 px-6 shadow-md">
      <Link href="/">
        <h1 className={`${caesar.className} text-3xl tracking-wide cursor-pointer`}>
          GAMORAX
        </h1>
      </Link>
    </div>
  );
}
