import { Outlet } from "react-router-dom";

import Navbar from "@/components/navigation/Navbar";
import TopScrollBar from "@/components/navigation/TopScrollBar";

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
