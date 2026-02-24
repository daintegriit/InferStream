import React from "react";
import Navbar from "../components/Navbar";

const Layout = ({ children, selectedModel, onChangeModel, result }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar
        selectedModel={selectedModel}
        onChangeModel={onChangeModel}
        result={result}
      />
      <main className="p-6">{children}</main>
    </div>
  );
};

export default Layout;
