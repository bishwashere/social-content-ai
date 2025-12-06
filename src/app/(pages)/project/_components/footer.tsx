export function Footer() {
  return (
    <footer className="border-t mt-12 py-6">
      <div className="max-w-7xl 2xl:max-w-[90%] mx-auto px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <div className="flex flex-col md:flex-row justify-between text-xs text-gray-400 gap-4">
          <div className="flex gap-6">
            <a href="/ideas" className="hover:underline">
              Ideas
            </a>
            <a href="/documentation" className="hover:underline">
              Documentation
            </a>
            <a href="/privacy" className="hover:underline">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:underline">
              Terms & Conditions
            </a>
          </div>
          <div className="text-center md:text-left">
            Copyright © 2025. All rights reserved. NextPostAI
          </div>
        </div>
      </div>
    </footer>
  );
}

