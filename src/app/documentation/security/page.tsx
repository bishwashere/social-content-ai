"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Database, Shield } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Security Overview</h1>
        <p className="text-muted-foreground text-lg">
          How we protect your social media account credentials and data
        </p>
      </div>

      <div className="space-y-6">
          {/* Encryption at Rest */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Encryption at Rest</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                All OAuth access tokens and refresh tokens are encrypted before being stored in our database using industry-standard encryption algorithms.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Uses AES-256-CBC encryption with unique initialization vectors (IV) for each token</li>
                <li>Encryption keys are stored separately from the database in secure environment variables</li>
                <li>Even with database access, tokens remain encrypted and unusable without the encryption key</li>
                <li>Each token is encrypted with a unique IV, ensuring identical tokens produce different encrypted values</li>
              </ul>
            </CardContent>
          </Card>

          {/* Token Lifecycle Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle>Token Lifecycle Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We implement automatic token refresh mechanisms to maintain secure connections without requiring manual re-authentication.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Tokens are automatically refreshed before expiration</li>
                <li>Expired tokens trigger automatic refresh using stored refresh tokens</li>
                <li>Failed refresh attempts are logged and users are notified</li>
                <li>Users can revoke access at any time through platform settings</li>
              </ul>
            </CardContent>
          </Card>

          {/* Database Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <CardTitle>Database Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Our database architecture ensures that sensitive credentials are never stored in plain text.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Encrypted tokens are stored in dedicated OAuth provider tables</li>
                <li>Tokens are only decrypted in-memory when needed for API calls</li>
                <li>No token data is logged or exposed in error messages</li>
                <li>Database access is restricted to application servers only</li>
              </ul>
            </CardContent>
          </Card>

          {/* Security Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle>Security Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Environment Security</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Encryption keys stored in secure environment variables, never in code</li>
                  <li>Environment variables are not accessible through application logs</li>
                  <li>Separate encryption keys for different environments (development, production)</li>
                  <li>Regular key rotation policies</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Access Control</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Tokens are only decrypted in-memory when needed for API calls</li>
                  <li>No token data is included in error messages or logs</li>
                  <li>Database queries are parameterized to prevent injection attacks</li>
                  <li>API endpoints require authentication before accessing tokens</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Compliance & Privacy</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Users can disconnect platforms at any time</li>
                  <li>All tokens are deleted when a platform connection is removed</li>
                  <li>No personal data is stored beyond what&apos;s necessary for API functionality</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Security Considerations</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  We continuously monitor and address security considerations across our platform:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Regular security assessments and penetration testing</li>
                  <li>Monitoring for potential security issues and vulnerabilities</li>
                  <li>Prompt patching of identified security concerns</li>
                  <li>Compliance with industry security standards</li>
                  <li>Third-party security audits and reviews</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3 italic">
                  Note: Specific security vulnerabilities are not disclosed publicly to protect user data and platform security. 
                  Security researchers can report issues through our responsible disclosure program.
                </p>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

