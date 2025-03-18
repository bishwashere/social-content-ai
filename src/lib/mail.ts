import { EMAIL_TEMPLATES, EmailTemplate } from "@/components/email-templates";
import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Mail {
  export type EmailOptions = {
    to: string[];
    subject: string;
    html: string;
  };
}

class Mail {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(options: Mail.EmailOptions) {
    return this.transporter.sendMail({
      from: process.env.EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }

  getTemplate(template: EmailTemplate) {
    return EMAIL_TEMPLATES[template];
  }

  renderTemplate<T extends EmailTemplate>(
    template: T,
    data: React.ComponentProps<(typeof EMAIL_TEMPLATES)[T]>
  ) {
    const Template = this.getTemplate(template);
    // @ts-expect-error:  ......
    return render(React.createElement(Template, data));
  }

  async sendTemplate<T extends EmailTemplate>(
    template: T,
    data: React.ComponentProps<(typeof EMAIL_TEMPLATES)[T]>,
    options: Omit<Mail.EmailOptions, "html">
  ) {
    const html = await this.renderTemplate(template, data);
    return this.send({ ...options, html });
  }
}

export const mail = new Mail();
