import { Html, Head, Body, Container, Text, Button, Row, Column, Section } from "@react-email/components";

interface InactivityEmailProps {
  name: string;
  dashboardUrl: string;
  stats: {
    projectCount: number;
    platformCount: number;
    contentCount: number;
  };
}

export default function InactivityEmail({ name, dashboardUrl, stats }: InactivityEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", color: "#111827", fontFamily: "Arial, sans-serif", padding: "20px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 24px", backgroundColor: "#ffffff", borderRadius: "12px" }}>

          <Text style={{ fontSize: "26px", fontWeight: "bold", marginBottom: "8px", textAlign: "center" }}>
            Great to see you, {name}!
          </Text>

          <Text style={{ fontSize: "16px", color: "#4b5563", lineHeight: "1.6", textAlign: "center", marginBottom: "32px" }}>
            You've been building something meaningful. Here's a snapshot of everything you've put together so far — it's worth coming back to.
          </Text>

          <Section style={{ backgroundColor: "#f9fafb", borderRadius: "10px", padding: "20px", marginBottom: "32px" }}>
            <Row>
              <Column style={{ textAlign: "center", padding: "8px 16px" }}>
                <Text style={{ fontSize: "32px", fontWeight: "bold", color: "#2563eb", margin: "0" }}>
                  {stats.projectCount}
                </Text>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
                  {stats.projectCount === 1 ? "Project" : "Projects"}
                </Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "8px 16px", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb" }}>
                <Text style={{ fontSize: "32px", fontWeight: "bold", color: "#2563eb", margin: "0" }}>
                  {stats.platformCount}
                </Text>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
                  {stats.platformCount === 1 ? "Platform" : "Platforms"}
                </Text>
              </Column>
              <Column style={{ textAlign: "center", padding: "8px 16px" }}>
                <Text style={{ fontSize: "32px", fontWeight: "bold", color: "#2563eb", margin: "0" }}>
                  {stats.contentCount}
                </Text>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
                  Content Pieces
                </Text>
              </Column>
            </Row>
          </Section>

          <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", textAlign: "center", marginBottom: "24px" }}>
            Your projects are lined up and quietly waiting. Pick up where you left off — every piece of content you create compounds over time.
          </Text>

          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: "600",
                padding: "14px 32px",
                borderRadius: "8px",
                textDecoration: "none",
                display: "inline-block",
                fontSize: "16px",
              }}
            >
              Continue Creating →
            </Button>
          </Section>

          <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginBottom: "4px" }}>
            Button not working? Copy and paste this link into your browser:
          </Text>
          <Text style={{ fontSize: "12px", color: "#2563eb", textAlign: "center", wordBreak: "break-all", marginBottom: "20px" }}>
            {dashboardUrl}
          </Text>

          <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
            If you have any questions, feel free to reach out to us.
          </Text>

        </Container>
      </Body>
    </Html>
  );
}
