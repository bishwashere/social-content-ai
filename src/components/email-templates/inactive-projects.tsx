import { Html, Head, Body, Container, Text, Button } from "@react-email/components";

interface InactivityEmailProps {
  name: string;
  inactiveProjectsDetails: {
    name: string;
    inactivePlatforms: string[];
  }[];
  dashboardUrl: string;
}

export default function InactivityEmail({ name, inactiveProjectsDetails, dashboardUrl }: InactivityEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f3f4f6", color: "#000", fontFamily: "Arial, sans-serif", padding: "20px" }}>
        <Container style={{ padding: "24px", backgroundColor: "#ffffff", borderRadius: "8px", textAlign: "center" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px" }}>
            Hello {name}, you have inactive projects!
          </Text>
          <Text style={{ fontSize: "16px", color: "#4b5563", marginBottom: "12px" }}>
            We noticed that you haven&apos;t tracked these projects on our platform:
          </Text>

          {inactiveProjectsDetails.map((project, index) => (
            <Container key={index} style={{ marginBottom: "16px", padding: "10px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
              <Text style={{ fontSize: "18px", fontWeight: "bold" }}>{project.name}</Text>
              <Text style={{ fontSize: "14px", color: "#6b7280" }}>
                Inactive on: <strong>{project.inactivePlatforms.join(", ")}</strong>
              </Text>
            </Container>
          ))}

          <Text style={{ fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
            Keep your projects up to date to make the most out of our platform!
          </Text>

          <Button
            href={dashboardUrl}
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
            Track Your Projects
          </Button>

          <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: "20px" }}>
            If the button above does not work, please copy and paste the following link into your browser:
          </Text>

          <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#2563eb", wordBreak: "break-all" }}>
            {dashboardUrl}
          </Text>

          <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: "20px" }}>
            If you have any questions, feel free to contact us.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
