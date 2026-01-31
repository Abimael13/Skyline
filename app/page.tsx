import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ProgramDetails } from "@/components/sections/ProgramDetails";
import { CatalogPreview } from "@/components/sections/CatalogPreview";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative bg-navy-950 text-white selection:bg-blue-500/30">
      <Navbar />

      <main className="flex-grow">
        <Hero />
        <ProgramDetails />
        <CatalogPreview />
      </main>

      <Footer />
    </div>
  );
}
