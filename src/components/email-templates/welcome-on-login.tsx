import { Html, Head, Body, Container, Text, Button } from "@react-email/components";

export default function WelcomeEmail({ name, activationLink }: { name: string; activationLink: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", color: "#000", fontFamily: "Arial, sans-serif", padding: "20px" }}>
        <Container style={{ padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px", textAlign: "center" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>
            Welcome to NextPost AI, {name}!
          </Text>
          <Text style={{ fontSize: "16px", color: "#4b5563", marginBottom: "12px" }}>
            We are glad to have you onboard.
          </Text>
          <Text style={{ fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
            You can activate your <strong>7-day free trial</strong> by clicking the button below.
          </Text>
          <Button
            href={activationLink}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontWeight: "600",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
              fontSize: "16px",
            }}
          >
            Activate Trial
          </Button>

          <Text style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#6b7280",
            textDecoration: "underline",
          }}>
            {activationLink}
          </Text>

          <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: "20px" }}>
            If you have any questions, feel free to contact us.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
