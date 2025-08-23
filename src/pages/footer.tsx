import { FaHeart } from "react-icons/fa"; // Font Awesome Heart

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white py-4 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <p className="flex items-center justify-center gap-2">
        Made with <FaHeart className="text-red-500" /> by PK
      </p>
    </footer>
  );
}