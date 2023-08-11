const SibApiV3Sdk = require("sib-api-v3-sdk");
const fs = require("fs");
const Handlebars = require("handlebars");

// Load and compile the Handlebars template
const templateFile = fs.readFileSync("path/to/template.html", "utf8");
const template = Handlebars.compile(templateFile);

// Set up Sendinblue API client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = "YOUR_SENDINBLUE_API_KEY";

// Prepare the email data
const sender = { name: "Your Name", email: "yourname@example.com" };
const recipient = { name: "Recipient Name", email: "recipient@example.com" };
const subject = "Subject of your email";
const htmlContent = template({ name: recipient.name }); // Replace {{name}} with recipient's name

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
  }

  // 1) SET CONFIGURATION
  transporter() {
    return nodemailer
      .createTransport(
        new Transport({
          apiKey: process.env.SENDINBLUE_KEY,
        })
      )
      .use(
        "compile",
        hbs({
          viewEngine: {
            partialsDir: path.join(__dirname, "../views/partials"),
            layoutsDir: "../views/layouts",
            defaultLayout: "",
          },
          viewPath: "views",
          extName: ".hbs",
        })
      );
  }

  // 2) SEND EMAIL
  send(template, subject) {
    this.transporter()
      .sendMail({
        from: this.from, // sender address
        to: this.user.email, // list of recipients
        subject: subject, // Subject line
        template: template,
        context: {
          banner: this.banner,
          content: this.content,
          headerColor: this.headerColor,
          footerColor: this.footerColor,
          mainColor: this.mainColor,
          companyPhone: this.companyPhone,
          greeting: this.greeting,
          warning: this.warning,
          name: this.user.username,
          resetURL: this.resetURL,
          from: this.from,
          title: this.title,
          domainName: this.domainName,
          companyName: this.companyName,
        },
      })
      .then(() => {
        console.log("sent successfully");
      })
      .catch((err) => {
        console.log(err);
      });
  }

  sendEmail() {
    this.send(`${this.template}`, `${this.title}`);
  }

  sendForgottenPassword() {
    this.send("password", "Reset password");
  }

  sendWelcome() {
    this.send("welcome", "Login Notification");
  }
};
