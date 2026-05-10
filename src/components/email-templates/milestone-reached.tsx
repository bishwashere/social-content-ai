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

export type MilestoneType = "posts" | "impressions" | "campaign";

interface MilestoneReachedEmailProps {
  name: string;
  milestoneType: MilestoneType;
  milestoneValue: number;
  projectName: string;
  userStats: {
    totalPosts: number;
    totalImpressions: number;
    totalCampaigns: number;
  };
  dashboardUrl: string;
}

const MILESTONE_CONFIG: Record<
  MilestoneType,
  {
    icon: string;
    label: string;
    headline: (value: number, project: string) => string;
    subline: (value: number) => string;
    ctaLabel: string;
  }
> = {
  posts: {
    icon: "✦",
    label: "Posts Milestone",
    headline: (value, project) =>
      `You just hit ${value} posts on "${project}"`,
    subline: (value) =>
      `${value} pieces of content out in the world. Every post is a signal, and yours are adding up.`,
    ctaLabel: "Keep Creating",
  },
  impressions: {
    icon: "👁",
    label: "Impressions Milestone",
    headline: (value, project) =>
      `"${project}" just crossed ${value.toLocaleString()} impressions`,
    subline: (value) =>
      `${value.toLocaleString()} people have seen your content. That reach is real, and it compounds from here.`,
    ctaLabel: "See Your Analytics",
  },
  campaign: {
    icon: "🏁",
    label: "Campaign Completed",
    headline: (_value, project) =>
      `Your campaign on "${project}" is complete`,
    subline: () =>
      `You planned it, you ran it, you finished it. That consistency is what separates creators who grow from those who stall.`,
    ctaLabel: "Start Your Next Campaign",
  },
};

export default function MilestoneReachedEmail({
  name,
  milestoneType,
  milestoneValue,
  projectName,
  userStats,
  dashboardUrl,
}: MilestoneReachedEmailProps) {
  const config = MILESTONE_CONFIG[milestoneType];
  const { totalPosts, totalImpressions, totalCampaigns } = userStats;

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
              margin: "0 0 16px",
            }}
          >
            nextpostai.com
          </Text>

          {/* Milestone badge */}
          <Section style={{ textAlign: "center", marginBottom: "20px" }}>
            <Text
              style={{
                fontSize: "48px",
                margin: "0 0 8px",
                lineHeight: "1",
              }}
            >
              {config.icon}
            </Text>
            <Text
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#2563eb",
                backgroundColor: "#eff6ff",
                padding: "4px 12px",
                borderRadius: "999px",
                margin: "0",
              }}
            >
              {config.label}
            </Text>
          </Section>

          {/* Headline */}
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              textAlign: "center",
              margin: "0 0 8px",
              lineHeight: "1.35",
              color: "#111827",
            }}
          >
            {config.headline(milestoneValue, projectName)}
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
            Well done, {name}. {config.subline(milestoneValue)}
          </Text>

          {/* Personal stats */}
          <Text
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#374151",
              textAlign: "center",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Your impact so far
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
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#2563eb",
                    margin: "0",
                  }}
                >
                  {totalPosts.toLocaleString()}
                </Text>
                <Text
                  style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}
                >
                  Posts Created
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
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#2563eb",
                    margin: "0",
                  }}
                >
                  {totalImpressions.toLocaleString()}
                </Text>
                <Text
                  style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}
                >
                  Total Impressions
                </Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "8px 10px" }}>
                <Text
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#2563eb",
                    margin: "0",
                  }}
                >
                  {totalCampaigns.toLocaleString()}
                </Text>
                <Text
                  style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}
                >
                  Campaigns Run
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
                lineHeight: "1.5",
              }}
            >
              This is your progress. Keep the momentum going and the numbers will keep climbing.
            </Text>
          </Section>

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
              {config.ctaLabel}
            </Button>
          </Section>

          {/* Fallback link */}
          <Text
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              textAlign: "center",
              marginBottom: "4px",
            }}
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
          <Text
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              textAlign: "center",
              margin: "0",
            }}
          >
            If you have any questions, feel free to reach out to us. We&apos;re always happy to help.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
