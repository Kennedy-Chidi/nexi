const path = require("path");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const dotenv = require("dotenv");
const fs = require("fs");
const Handlebars = require("handlebars");
dotenv.config({ path: "../config.env" });

module.exports = class Email {
  constructor(company, user, email, bannerURL, content, resetURL) {
    this.companyName = company.companyName;
    this.domainName = company.domainName;
    this.from = company.systemEmail;
    this.user = user;
    this.template = email.template;
    this.companyPhone = company.media[2]?.text;
    this.title = email.title;
    this.banner = bannerURL;
    this.content = content;
    this.headerColor = email.headerColor;
    this.footerColor = email.footerColor;
    this.mainColor = email.mainColor;
    this.greeting = email.greeting;
    this.warning = email.warning;
    this.resetURL = resetURL;

    const templateFilePath = path.join(
      __dirname,
      `${this.template}.handlebars`
    );

    // Load and compile the Handlebars template
    const templateFile = fs.readFileSync(templateFilePath, "utf8");
    this.template = Handlebars.compile(templateFile);

    // Set up Sendinblue API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications[process.env.SENDINBLUE_API];
    apiKey.apiKey = process.env.SENDINBLUE_KEY;
  }

  sendEmail() {
    // Prepare the email data
    const sender = { name: "Your Name", email: this.from };
    const recipient = { name: this.user.username, email: this.user.email };
    const subject = this.title;
    const htmlContent = this.template({ name: recipient.name }); // Replace {{name}} with recipient's name

    // Send email using Sendinblue API
    const apiInstance = new SibApiV3Sdk.SMTPApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [recipient];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    apiInstance
      .sendTransacEmail(sendSmtpEmail)
      .then((response) => {
        console.log("Email sent successfully.");
        console.log(response);
      })
      .catch((error) => {
        console.error("Failed to send email.");
        console.error(error);
      });
  }
};
