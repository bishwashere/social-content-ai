export default function Footer() {
    return (
        <div className="">
            <hr className="border-gray-300 dark:border-gray-600 mb-6" />
            <div className="flex flex-col md:flex-row justify-between text-xs text-gray-400 gap-4 w-full px-5 md:px-20 lg:px-36 pt-2 pb-6">
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
                <div className="flex gap-4 justify-center md:justify-end">
                    <a href="#">
                        <i className="fab fa-facebook-f" />
                    </a>
                    <a href="#">
                        <i className="fab fa-instagram" />
                    </a>
                    <a href="#">
                        <i className="fab fa-youtube" />
                    </a>
                </div>
            </div>
        </div>
    )
}