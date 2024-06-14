const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");

const http = require("http");
const fs = require("fs");

app.set("view engine", "ejs");

app.use("/static", express.static("public"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

let baseUrl = "http://zensolar.syscloudtech.com";
// let baseUrl = "http://localhost:2828";

app.get("/", async (req, res) => {
  let priceListUrl = `${baseUrl}/price-list.pdf`;
  res.render("home", { priceListUrl });
});

app.get("/quotation", async (req, res) => {
  res.render("quotation");
});

app.post("/quotation", async (req, res) => {
  // console.log(req.body);

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

  let invoiceNumber = await generateRandomNumber();

  let quotationUrls = {
    cssUrl : `${baseUrl}/css/invoice-style.css`,
    logoUrl : `${baseUrl}/img/zensolar-logo.jpg`,
  }

  let quotationData = {
    quotationUrls,
    date,
    units,
    invoiceNumber,
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

    filename = `${name}-${units}Kw.pdf`;

    await page.pdf({
      path: `./public/downloads/${filename}`,
    });

    await browser.close();
  } catch (error) {
    console.error("error:", error);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: "zensolar.enterprises@gmail.com",
        pass: "tqig gkhk lwea rxve",
      },
    });

    var mailOptions = {
      from: "zensolar.enterprises@gmail.com",
      to: "zensolar.enterprises@gmail.com",
      subject: `Enquiry ${units}Kw - ${name} `,
      text: `
      Date: ${date},

      Hello Zensolar,

      Enquiry for ${units}Kw

      Name: ${name},
      units: ${units}Kw,
      phone_number: ${phone_number},
      address: ${address},
      city: ${city},
      pincode: ${pincode},
      structure: ${structure},

      Project Amount: ₹ ${quotationData.basePrice} X ${units} = ₹ ${quotationData.baseAmount}
      +
      GSTAmount: ₹ ${quotationData.gstAmount}
      ===============================
      Total Amount: ₹ ${quotationData.totalAmount}
      -
      Subsidy: ₹ ${quotationData.subsidyAmount}
      ===============================
      After Subsidy Amount: ₹ ${quotationData.aftSubsidyAmount}

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

  // downloadPdf(req, res, filename);

  res.redirect(`/download-pdf?filename=${filename}`);

});

function generateRandomNumber() {
  const prefix = "ZS";
  const year = new Date().getFullYear().toString().slice(2); // "24" for the year 2024
  const month = ("0" + (new Date().getMonth() + 1)).slice(-2); // "05" for May

  // Generate a random number between 0 and 999
  const randomNum = Math.floor(Math.random() * 1000);

  // Pad the random number with leading zeros to make it a 3-digit number
  const randomNumStr = ("000" + randomNum).slice(-3);

  // Construct the final string
  const finalStr = `${prefix}${year}${month}${randomNumStr}`;

  return finalStr;
}

app.get("/download-pdf", async (req, res) => {
  let filename = await req.query.filename;
  let fileUrl = `${baseUrl}/downloads/${filename}`;
  res.render("download_pdf", { filename, fileUrl });
});

app.post('/remove-file', async (req, res) => {
  let { filename } = req.body;
  let filePath = path.join(__dirname, 'public/downloads', filename);
  let fileRes = await fs.unlink(filePath, (err) => {
    if(err) {
      console.error(err);
    } else {
      res.redirect('/');
    }
  });
});

app.get("/quotation-pdf", (req, res) => {
  res.render("quotation_pdf");
});

let PORT = process.env.PORT || 2828;

app.listen(PORT, () =>
  console.log("server listening on ", PORT)
);
