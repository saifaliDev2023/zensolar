const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");

const http = require("http");
const fs = require("fs");
const { log } = require("console");

app.set("view engine", "ejs");

app.use("/static", express.static("public"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.render("home");
});

app.get("/quotation", async (req, res) => {
  res.render("quotation");
});

app.post("/quotation", async (req, res) => {
  console.log(req.body);

  let {
    name,
    phone_number,
    address,
    city,
    pincode,
    structure,
    units,
    meter_units,
  } = req.body;

  units = parseInt(units);
  let basePrice = 58000;
  let subsidyAmount = 78000;

  let baseAmount = basePrice * units;
  let gstAmount = baseAmount * 0.138;
  let totalAmount = baseAmount + gstAmount;
  let aftSubsidyAmount = totalAmount - subsidyAmount;

  const todayDate = new Date();

  const day = todayDate.getDate();
  const year = todayDate.getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[todayDate.getMonth()];

  let date = `${day} ${month} ${year}`;
  let filename;

  let quotationData = {
    date,
    units,
    name,
    phone_number,
    address,
    city,
    pincode,
    structure,
    basePrice: parseInt(basePrice).toLocaleString(),
    baseAmount: parseInt(baseAmount).toLocaleString(),
    subsidyAmount: parseInt(subsidyAmount).toLocaleString(),
    gstAmount: parseInt(gstAmount).toLocaleString(),
    totalAmount: parseInt(totalAmount).toLocaleString(),
    aftSubsidyAmount: parseInt(aftSubsidyAmount).toLocaleString(),
  };

  //   res.render("quotation_pdf", quotationData);

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const templatePath = "./views/quotation_pdf.ejs";
    const templateData = quotationData;

    const htmlContent = await ejs.renderFile(templatePath, templateData);

    await page.setContent(htmlContent);

    filename = `${name}-${units}Kw`;

    await page.pdf({
      path: `./downloads/${filename}.pdf`,
    });

    await browser.close();
  } catch (error) {
    console.error("error:", error);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "ilene16@ethereal.email",
        pass: "FUNkKqRwV7XPNyuqxY",
      },
    });

    var mailOptions = {
      from: "zensolar.enterprises@gmail.com",
      to: "zensolar.enterprises@gmail.com",
      subject: `Enquiry ${units}Kw - ${filename} `,
      text: `
      Date: ${date},

      Hello Zensolar,

      Enquiry for ${units}Kw

      Name: ${name},
      units: ${units},
      phone_number: ${phone_number},
      address: ${address},
      city: ${city},
      pincode: ${pincode},
      structure: ${structure},

      Project Amount: ${basePrice} X ${units} = ${baseAmount}
      Total Amount: ${totalAmount}

      Subsidy: ${subsidyAmount}
      GSTAmount: ${gstAmount}  

      After Subsidy Amount: ${aftSubsidyAmount}

      Thanks and Regards,
      ${name}
      `,
    };

    await transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  } catch (error) {
    console.error("error:", error);
  }

  res.render("home");
});

app.get("/quotation-pdf", (req, res) => {
  res.render("quotation_pdf");
});

app.listen(2828, () =>
  console.log("server listening on http://localhost:2828")
);
