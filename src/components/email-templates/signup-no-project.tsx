import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Row,
  Column,
  Section,
  Hr,
} from "@react-email/components";

interface SignupNoProjectEmailProps {
  name: string;
  dashboardUrl: string;
  platformStats: {
    totalPostsGenerated: number;
    totalProjectsCreated: number;
    totalPlatformsConnected: number;
    totalUsersActive: number;
  };
}

const TOP_FEATURES = [
  {
    icon: "✦",
    title: "AI Content Generation",
    description:
      "Generate scroll-stopping posts for LinkedIn, Twitter, Instagram, and more in seconds.",
  },
  {
    icon: "📅",
    title: "Multi-Platform Scheduling",
    description:
      "Plan your entire content calendar and auto-publish to all your social channels at the perfect time.",
  },
  {
    icon: "📊",
    title: "Analytics & AI Campaign Suggestions",
    description:
      "See what's working across your campaigns and let AI recommend your next winning content strategy.",
  },
  {
    icon: "🎬",
    title: "Quick Video Maker",
    description:
      "Turn ideas into viral short-form videos in 3 steps. No editing skills required.",
  },
  {
    icon: "📰",
    title: "Blog News Auto-Post",
    description:
      "Automatically fetch trending articles, generate AI blogs, and publish social excerpts. Fully hands-free.",
  },
];

export default function SignupNoProjectEmail({
  name,
  dashboardUrl,
  platformStats,
}: SignupNoProjectEmailProps) {
  const { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive } =
    platformStats;

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#f3f4f6",
          color: "#111827",
          fontFamily: "Arial, sans-serif",
          padding: "20px",
        }}
      >
        <Container
          style={{
            maxWidth: "580px",
            margin: "0 auto",
            padding: "36px 28px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
          }}
        >
          {/* Header */}
          <Text
            style={{
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.12em",
              color: "#2563eb",
              textAlign: "center",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            nextpostai.com
          </Text>

          <Text
            style={{
              fontSize: "26px",
              fontWeight: "bold",
              textAlign: "center",
              margin: "0 0 8px",
              lineHeight: "1.3",
            }}
          >
            Welcome aboard, {name}!
          </Text>

          <Text
            style={{
              fontSize: "15px",
              color: "#4b5563",
              lineHeight: "1.6",
              textAlign: "center",
              margin: "0 0 28px",
            }}
          >
            You signed up. That's step one. Now let's launch your first project and put AI to work for your content.
          </Text>

          {/* Next Step Card */}
          <Section
            style={{
              backgroundColor: "#eff6ff",
              borderLeft: "4px solid #2563eb",
              borderRadius: "8px",
              padding: "16px 20px",
              marginBottom: "28px",
            }}
          >
            <Text style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px" }}>
              YOUR NEXT STEP
            </Text>
            <Text
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#1d4ed8",
                margin: "0 0 6px",
                lineHeight: "1.3",
              }}
            >
              Launch your first project
            </Text>
            <Text
              style={{
                fontSize: "13px",
                color: "#3b82f6",
                margin: "0",
                lineHeight: "1.5",
              }}
            >
              A project is your home base. Add your brand, connect your platforms, and start generating content in minutes.
            </Text>
          </Section>

          {/* Platform Stats */}
          <Text
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              textAlign: "center",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            What creators are building on nextpostai.com
          </Text>

          <Section
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "10px",
              padding: "20px 16px",
              marginBottom: "32px",
            }}
          >
            <Row>
              <Column style={{ textAlign: "center", padding: "8px 10px" }}>
                <Text
                  style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb", margin: "0" }}
                >
                  {totalPostsGenerated.toLocaleString()}+
                </Text>
                <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                  Posts Generated
                </Text>
              </Column>
              <Column
                style={{
                  textAlign: "center",
                  padding: "8px 10px",
                  borderLeft: "1px solid #e5e7eb",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                <Text
                  style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb", margin: "0" }}
                >
                  {totalProjectsCreated.toLocaleString()}+
                </Text>
                <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                  Projects Created
                </Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "8px 10px" }}>
                <Text
                  style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb", margin: "0" }}
                >
                  {totalPlatformsConnected.toLocaleString()}+
                </Text>
                <Text style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>
                  Platforms Connected
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />

            <Text
              style={{
                fontSize: "13px",
                color: "#6b7280",
                textAlign: "center",
                margin: "0",
              }}
            >
              Joined by{" "}
              <strong style={{ color: "#374151" }}>
                {totalUsersActive.toLocaleString()}+ creators
              </strong>{" "}
              growing their brands with AI-powered content.
            </Text>
          </Section>

          {/* Top Features */}
          <Text
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#111827",
              margin: "0 0 16px",
            }}
          >
            5 things waiting for you inside
          </Text>

          {TOP_FEATURES.map((feature, index) => (
            <Section
              key={index}
              style={{
                marginBottom: index < TOP_FEATURES.length - 1 ? "12px" : "28px",
              }}
            >
              <Row>
                <Column style={{ width: "36px", verticalAlign: "top", paddingTop: "2px" }}>
                  <Text style={{ fontSize: "18px", margin: "0", lineHeight: "1.4" }}>
                    {feature.icon}
                  </Text>
                </Column>
                <Column style={{ verticalAlign: "top" }}>
                  <Text
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#111827",
                      margin: "0 0 2px",
                    }}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      lineHeight: "1.5",
                      margin: "0",
                    }}
                  >
                    {feature.description}
                  </Text>
                </Column>
              </Row>
            </Section>
          ))}

          {/* CTA */}
          <Section style={{ textAlign: "center", marginBottom: "28px" }}>
            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: "600",
                padding: "14px 36px",
                borderRadius: "8px",
                textDecoration: "none",
                display: "inline-block",
                fontSize: "16px",
              }}
            >
              Launch Your First Project
            </Button>
          </Section>

          {/* Fallback link */}
          <Text
            style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginBottom: "4px" }}
          >
            Button not working? Copy and paste this link into your browser:
          </Text>
          <Text
            style={{
              fontSize: "12px",
              color: "#2563eb",
              textAlign: "center",
              wordBreak: "break-all",
              marginBottom: "24px",
            }}
          >
            {dashboardUrl}
          </Text>

          {/* Footer */}
          <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 20px" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", margin: "0" }}>
            If you have any questions, feel free to reach out to us. We&apos;re always happy to help.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
