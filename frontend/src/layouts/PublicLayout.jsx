import { Outlet } from "react-router-dom";

import Navbar from "@/features/landing/components/navigation/Navbar";
import TopScrollBar from "@/features/landing/components/navigation/TopScrollBar";

export default function PublicLayout() {
  return (
    <>
      <Navbar />
      <TopScrollBar />
      <main>
        <Outlet />
      </main>
    </>
  );
}
