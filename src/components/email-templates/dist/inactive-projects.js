"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InactivityEmail;
import jsx_runtime_1 from "react/jsx-runtime";
import components_1 from "@react-email/components"

function InactivityEmail(_a) {
    var name = _a.name, inactiveProjectsDetails = _a.inactiveProjectsDetails, dashboardUrl = _a.dashboardUrl;
    return ((0, jsx_runtime_1.jsxs)(components_1.Html, { children: [(0, jsx_runtime_1.jsx)(components_1.Head, {}), (0, jsx_runtime_1.jsx)(components_1.Body, { style: {
                    backgroundColor: "#f4f7fa",
                    color: "#1f2937",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    padding: "20px",
                    lineHeight: "1.6"
                }, children: (0, jsx_runtime_1.jsxs)(components_1.Container, { style: {
                        maxWidth: "600px",
                        padding: "32px",
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
                    }, children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { style: {
                                fontSize: "28px",
                                fontWeight: "600",
                                color: "#111827",
                                marginBottom: "8px",
                                textAlign: "center"
                            }, children: ["Hey ", name, ", Your Projects Need Attention!"] }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                fontSize: "16px",
                                color: "#6b7280",
                                textAlign: "center",
                                marginBottom: "24px"
                            }, children: "It looks like some of your projects haven\u2019t been updated on our dashboard lately." }), (0, jsx_runtime_1.jsx)(components_1.Section, { style: {
                                backgroundColor: "#f9fafb",
                                padding: "16px",
                                borderRadius: "8px",
                                marginBottom: "24px"
                            }, children: (0, jsx_runtime_1.jsx)(components_1.Text, { style: { fontSize: "14px", color: "#4b5563" }, children: "Stay active to maximize your social media presence!" }) }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                fontSize: "18px",
                                fontWeight: "500",
                                marginBottom: "16px"
                            }, children: "Inactive Projects:" }), inactiveProjectsDetails.map(function (project, index) { return ((0, jsx_runtime_1.jsxs)(components_1.Section, { style: {
                                marginBottom: "16px",
                                padding: "16px",
                                backgroundColor: "#fefcbf",
                                borderRadius: "8px",
                                border: "1px solid #fef08a"
                            }, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        color: "#854d0e",
                                        marginBottom: "4px"
                                    }, children: project.name }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: { fontSize: "14px", color: "#713f12" }, children: ["No recent posts tracked on: ", (0, jsx_runtime_1.jsx)("strong", { children: project.inactivePlatforms.join(", ") })] })] }, index)); }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                fontSize: "16px",
                                color: "#4b5563",
                                margin: "24px 0",
                                textAlign: "center"
                            }, children: "Log in to your dashboard to update your posting activity and keep your social media thriving." }), (0, jsx_runtime_1.jsx)(components_1.Button, { href: dashboardUrl, style: {
                                backgroundColor: "#1d4ed8",
                                color: "#ffffff",
                                fontWeight: "600",
                                padding: "12px 32px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                display: "block",
                                textAlign: "center",
                                fontSize: "16px",
                                margin: "0 auto",
                                transition: "background-color 0.2s ease"
                            }, children: "Update My Dashboard" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                fontSize: "12px",
                                color: "#9ca3af",
                                marginTop: "20px",
                                textAlign: "center"
                            }, children: "Trouble with the button? Use this link:" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                fontSize: "14px",
                                color: "#1d4ed8",
                                textAlign: "center",
                                wordBreak: "break-all"
                            }, children: dashboardUrl }), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: {
                                borderColor: "#e5e7eb",
                                margin: "24px 0"
                            } }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                fontSize: "12px",
                                color: "#6b7280",
                                textAlign: "center"
                            }, children: "Need help? Reply to this email or contact our support team. Happy posting!" })] }) })] }));
}
