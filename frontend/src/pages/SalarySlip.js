import React, { useState, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "react-toastify";

// Fetch array buffer for background image with timeout
async function fetchArrayBuffer(url) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5s timeout
    const response = await fetch(url, { mode: "cors", signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

// Validate image format (PNG or JPEG)
async function validateImageFormat(arrayBuffer) {
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
  const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  if (!isJpeg && !isPng) throw new Error("Invalid image format. Only PNG and JPEG supported.");
  return isJpeg;
}

// Helper to format date with ordinal suffix (e.g., 1st April 2025)
function formatDateWithOrdinal(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const ordinal = (day % 10 === 1 && day !== 11) ? "st" :
                  (day % 10 === 2 && day !== 12) ? "nd" :
                  (day % 10 === 3 && day !== 13) ? "rd" : "th";
  return `${day}${ordinal} ${month} ${year}`;
}

// Helper to get month and year from date
function getMonthYear(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

// Helper to format currency (PKR 20,000.00)
function formatCurrency(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return "PKR 0.00";
  return `PKR ${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
}

// Calculate actual number of days between two dates (inclusive)
function calculateActualDays(fromDate, tillDate) {
  if (!fromDate || !tillDate) return 0;
  const from = new Date(fromDate);
  const till = new Date(tillDate);
  if (till < from) return 0;
  return Math.floor((till - from) / (1000 * 60 * 60 * 24)) + 1;
}

// Calculate number of days between two dates (inclusive), normalizing 30 or 31 days to 30
function calculateDays(fromDate, tillDate) {
  if (!fromDate || !tillDate) return 0;
  const from = new Date(fromDate);
  const till = new Date(tillDate);
  if (till < from) return 0;
  const days = Math.floor((till - from) / (1000 * 60 * 60 * 24)) + 1;
  return (days === 30 || days === 31) ? 30 : days;
}

// Generate PDF with background, structured layout, and table
async function generateSalarySlipPDF(data, lineSpacing) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const margin = 50;
    const topSpace = 144; // 2 inches
    const fontSize = 12;
    const tableFontSize = 10;
    let lineHeight = fontSize + 5; // Default single
    if (lineSpacing === '1.5') lineHeight = fontSize + 8;
    if (lineSpacing === 'double') lineHeight = fontSize + 12;
    const tableLineHeight = tableFontSize + 10; // Increased for higher rows
    const padding = 10;

    // Embed fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw background function
    const drawBackground = async (currentPage) => {
      try {
        const imageArrayBuffer = await fetchArrayBuffer("/bg.png");
        const isJpeg = await validateImageFormat(imageArrayBuffer);
        const backgroundImage = isJpeg
          ? await pdfDoc.embedJpg(imageArrayBuffer)
          : await pdfDoc.embedPng(imageArrayBuffer);
        currentPage.drawImage(backgroundImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      } catch (error) {
        console.warn("Using fallback background:", error.message);
        currentPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) }); // White fallback
      }
    };

    await drawBackground(page);

    // Main heading: Salary Slip for [Month Year]
    const headingText = `Salary Slip for ${getMonthYear(data.fromDate)}`;
    const headingWidth = fontBold.widthOfTextAtSize(headingText, fontSize + 2);
    page.drawText(headingText, {
      x: (pageWidth - headingWidth) / 2,
      y: pageHeight - margin,
      size: fontSize + 2,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Start details below top space
    const detailsStartY = pageHeight - margin - topSpace;

    // Basic Information in two columns
    let yLeft = detailsStartY;
    const leftColumnX = margin;
    const rightColumnX = pageWidth / 2;

    // Left column
    page.drawText("Name: ", { x: leftColumnX, y: yLeft, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const nameLabelWidth = fontBold.widthOfTextAtSize("Name: ", fontSize);
    page.drawText(data.name, { x: leftColumnX + nameLabelWidth, y: yLeft, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yLeft -= lineHeight;

    page.drawText("Title: ", { x: leftColumnX, y: yLeft, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const titleLabelWidth = fontBold.widthOfTextAtSize("Title: ", fontSize);
    page.drawText(data.title, { x: leftColumnX + titleLabelWidth, y: yLeft, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yLeft -= lineHeight;

    page.drawText("Schools: ", { x: leftColumnX, y: yLeft, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yLeft -= lineHeight;
    const schoolsList = data.schools ? data.schools.split("\n").filter(s => s.trim()) : ["None"];
    schoolsList.forEach((school) => {
      page.drawText(school.trim(), { x: leftColumnX + 20, y: yLeft, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
      yLeft -= lineHeight;
    });

    page.drawText("Date of joining: ", { x: leftColumnX, y: yLeft, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const joiningLabelWidth = fontBold.widthOfTextAtSize("Date of joining: ", fontSize);
    page.drawText(formatDateWithOrdinal(data.dateOfJoining), { x: leftColumnX + joiningLabelWidth, y: yLeft, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yLeft -= lineHeight * 2; // Extra space

    // Right column
    let yRight = detailsStartY;
    page.drawText("From Date: ", { x: rightColumnX, y: yRight, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const fromLabelWidth = fontBold.widthOfTextAtSize("From Date: ", fontSize);
    page.drawText(formatDateWithOrdinal(data.fromDate), { x: rightColumnX + fromLabelWidth, y: yRight, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yRight -= lineHeight;

    page.drawText("Till Date: ", { x: rightColumnX, y: yRight, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const tillLabelWidth = fontBold.widthOfTextAtSize("Till Date: ", fontSize);
    page.drawText(formatDateWithOrdinal(data.tillDate), { x: rightColumnX + tillLabelWidth, y: yRight, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yRight -= lineHeight;

    page.drawText("Basic Salary: ", { x: rightColumnX, y: yRight, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const basicLabelWidth = fontBold.widthOfTextAtSize("Basic Salary: ", fontSize);
    page.drawText(formatCurrency(data.basicSalary), { x: rightColumnX + basicLabelWidth, y: yRight, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yRight -= lineHeight;

    page.drawText("Payment Date: ", { x: rightColumnX, y: yRight, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const paymentLabelWidth = fontBold.widthOfTextAtSize("Payment Date: ", fontSize);
    page.drawText(formatDateWithOrdinal(data.paymentDate), { x: rightColumnX + paymentLabelWidth, y: yRight, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yRight -= lineHeight;

    page.drawText("Bank Name: ", { x: rightColumnX, y: yRight, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const bankLabelWidth = fontBold.widthOfTextAtSize("Bank Name: ", fontSize);
    page.drawText(data.bankName, { x: rightColumnX + bankLabelWidth, y: yRight, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yRight -= lineHeight;

    page.drawText("Acct #: ", { x: rightColumnX, y: yRight, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    const acctLabelWidth = fontBold.widthOfTextAtSize("Acct #: ", fontSize);
    page.drawText(data.accountNumber, { x: rightColumnX + acctLabelWidth, y: yRight, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
    yRight -= lineHeight * 2; // Extra space

    // No of Days
    let yPosition = Math.min(yLeft, yRight);
    const daysText = data.noOfDays === 31 ? `${data.noOfDays} (normalized to 30 for calculation)` : `${data.noOfDays}`;
    page.drawText(`No of Days: ${daysText}`, { x: margin, y: yPosition, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yPosition -= lineHeight * 1.5;

    // Earnings section
    page.drawText("Earnings:", { x: margin, y: yPosition, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yPosition -= lineHeight;
    data.earnings.forEach((earning) => {
      page.drawText(`${earning.category}: ${formatCurrency(earning.amount)}`, { x: margin + 20, y: yPosition, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
      yPosition -= lineHeight;
    });
    page.drawText(`Total Earnings: ${formatCurrency(data.totalEarning)}`, { x: margin, y: yPosition, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yPosition -= lineHeight * 2;

    // Deductions section
    page.drawText("Deductions:", { x: margin, y: yPosition, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yPosition -= lineHeight;
    data.deductions.forEach((deduction) => {
      page.drawText(`${deduction.category}: ${formatCurrency(deduction.amount)}`, { x: margin + 20, y: yPosition, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
      yPosition -= lineHeight;
    });
    page.drawText(`Total Deductions: ${formatCurrency(data.totalDeduction)}`, { x: margin, y: yPosition, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yPosition -= lineHeight * 2;

    // Net Payable
    page.drawText(`Net Payable: ${formatCurrency(data.netPay)}`, { x: margin, y: yPosition, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
    yPosition -= lineHeight;

    // Footer
    const footerText = "This is a system generated salary slip and doesn’t require signature.";
    const footerWidth = fontRegular.widthOfTextAtSize(footerText, 10);
    const footerY = margin; // Fixed at bottom
    page.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: footerY,
      size: 10,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    toast.error(`Failed to generate salary slip: ${error.message}`);
    throw error;
  }
}

// Simple function to render preview as HTML
function renderPreview(data) {
  const schoolsList = data.schools ? data.schools.split("\n").filter(s => s.trim()) : ["None"];
  const daysText = data.noOfDays === 31 ? `${data.noOfDays} (normalized to 30 for calculation)` : `${data.noOfDays}`;
  return `
    <div class="p-4 bg-white border rounded-lg">
      <h3 class="text-center font-bold mb-4">Salary Slip for ${getMonthYear(data.fromDate)}</h3>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Schools:</strong></p>
          <ul class="list-disc ml-4">
            ${schoolsList.map(school => `<li>${school}</li>`).join("")}
          </ul>
          <p><strong>Date of joining:</strong> ${formatDateWithOrdinal(data.dateOfJoining)}</p>
        </div>
        <div>
          <p><strong>From Date:</strong> ${formatDateWithOrdinal(data.fromDate)}</p>
          <p><strong>Till Date:</strong> ${formatDateWithOrdinal(data.tillDate)}</p>
          <p><strong>Basic Salary:</strong> ${formatCurrency(data.basicSalary)}</p>
          <p><strong>Payment Date:</strong> ${formatDateWithOrdinal(data.paymentDate)}</p>
          <p><strong>Bank Name:</strong> ${data.bankName}</p>
          <p><strong>Acct #:</strong> ${data.accountNumber}</p>
        </div>
      </div>
      <p class="mb-2"><strong>No of Days:</strong> ${daysText}</p>
      <div class="mb-4">
        <p class="font-bold">Earnings:</p>
        <ul class="list-disc ml-4">
          ${data.earnings.map(earning => `<li>${earning.category}: ${formatCurrency(earning.amount)}</li>`).join("")}
          <li class="font-bold">Total Earnings: ${formatCurrency(data.totalEarning)}</li>
        </ul>
      </div>
      <div class="mb-4">
        <p class="font-bold">Deductions:</p>
        <ul class="list-disc ml-4">
          ${data.deductions.map(deduction => `<li>${deduction.category}: ${formatCurrency(deduction.amount)}</li>`).join("")}
          <li class="font-bold">Total Deductions: ${formatCurrency(data.totalDeduction)}</li>
        </ul>
      </div>
      <p class="font-bold">Net Payable: ${formatCurrency(data.netPay)}</p>
      <p class="text-center text-sm mt-4">This is a system generated salary slip and doesn’t require signature.</p>
    </div>
  `;
}

const SalarySlip = () => {
  const [companyName, setCompanyName] = useState("EARLY BIRD KODER KIDS PVT LTD");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [schools, setSchools] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [tillDate, setTillDate] = useState("");
  const [basicSalary, setBasicSalary] = useState(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [noOfDays, setNoOfDays] = useState(0);
  const [proratedSalary, setProratedSalary] = useState(0);
  const [earnings, setEarnings] = useState([]); // [{category: 'Bonus', amount: 1000}]
  const [deductions, setDeductions] = useState([]); // [{category: 'Loan', amount: 500}]
  const [totalEarning, setTotalEarning] = useState(0);
  const [totalDeduction, setTotalDeduction] = useState(0);
  const [netPay, setNetPay] = useState(0);
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [teachers, setTeachers] = useState([]); // List of teachers for dropdown
  const [selectedTeacherId, setSelectedTeacherId] = useState(""); // Selected teacher ID

  // Fetch list of teachers on component mount
  useEffect(() => {
    const fetchTeachers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/employees/api/teachers/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch teachers: ${response.statusText}`);
        const data = await response.json();
        setTeachers(data);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        toast.error('Failed to load teacher list');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  // Fetch default dates
  useEffect(() => {
    const fetchDefaultDates = async () => {
      try {
        const response = await fetch('/employees/api/default-dates/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch default dates: ${response.statusText}`);
        const data = await response.json();
        setFromDate(data.fromDate);
        setTillDate(data.tillDate);
        setPaymentDate(data.paymentDate);
      } catch (err) {
        console.error('Error fetching default dates:', err);
        toast.error('Failed to load default dates');
      }
    };
    fetchDefaultDates();
  }, []);

  // Fetch teacher profile data when selectedTeacherId changes
  useEffect(() => {
    if (!selectedTeacherId) {
      // Reset fields when no teacher is selected
      setName("");
      setTitle("");
      setSchools("");
      setDateOfJoining("");
      setBasicSalary(0);
      setBankName("");
      setAccountNumber("");
      setEarnings([]);
      setDeductions([]);
      return;
    }

    const fetchTeacherProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/employees/api/teacher/${selectedTeacherId}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch teacher profile: ${response.statusText}`);
        const data = await response.json();
        setName(data.name || "");
        setTitle(data.title || "");
        setSchools(data.schools.join('\n') || "");
        setDateOfJoining(data.date_of_joining?.split('T')[0] || "");
        setBasicSalary(data.basic_salary || 0);
        setBankName(data.bank_name || "");
        setAccountNumber(data.account_number || "");
        setEarnings(data.earnings || []);
        setDeductions(data.deductions || []);
      } catch (err) {
        console.error('Error fetching teacher profile:', err);
        toast.error('Failed to load teacher profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeacherProfile();
  }, [selectedTeacherId]);

  // Auto-calculate on changes
  useEffect(() => {
    const actualDays = calculateActualDays(fromDate, tillDate);
    const daysForCalculation = calculateDays(fromDate, tillDate);
    setNoOfDays(actualDays);
    const prorated = (basicSalary / 30) * daysForCalculation || 0;
    setProratedSalary(prorated);
    const additionalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const earning = prorated + additionalEarnings;
    const deduction = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
    setTotalEarning(earning);
    setTotalDeduction(deduction);
    setNetPay(earning - deduction);
  }, [fromDate, tillDate, basicSalary, earnings, deductions]);

  const addEarning = () => {
    setEarnings([...earnings, { category: '', amount: 0 }]);
  };

  const updateEarning = (index, field, value) => {
    const updated = [...earnings];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setEarnings(updated);
  };

  const removeEarning = (index) => {
    setEarnings(earnings.filter((_, i) => i !== index));
  };

  const addDeduction = () => {
    setDeductions([...deductions, { category: '', amount: 0 }]);
  };

  const updateDeduction = (index, field, value) => {
    const updated = [...deductions];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setDeductions(updated);
  };

  const removeDeduction = (index) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleGenerateSlip = async () => {
    if (!name || !title || !dateOfJoining || !fromDate || !tillDate || !paymentDate || !bankName || !accountNumber) {
      setErrorMessage("Please fill all required fields.");
      toast.warning("All fields are required.");
      return;
    }
    if (noOfDays <= 0) {
      setErrorMessage("Invalid date range: Till Date must be after From Date.");
      toast.warning("Invalid date range.");
      return;
    }

    setErrorMessage("");
    setIsGenerating(true);

    try {
      const data = {
        companyName,
        name,
        title,
        schools,
        dateOfJoining,
        fromDate,
        tillDate,
        basicSalary,
        paymentDate,
        bankName,
        accountNumber,
        noOfDays,
        proratedSalary,
        earnings: [{category: 'Salary', amount: proratedSalary}, ...earnings],
        deductions,
        totalEarning,
        totalDeduction,
        netPay,
      };
      const pdfBlob = await generateSalarySlipPDF(data, lineSpacing);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Salary_Slip_${name.replace(/\s+/g, "_")}_${getMonthYear(fromDate).replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Salary slip generated successfully!");
    } catch (error) {
      setErrorMessage(`Failed to generate salary slip: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-700 mb-6">📊 Salary Slip Generator</h2>

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{errorMessage}</div>
      )}

      {isLoading && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded-lg">Loading data...</div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col">
          <label className="font-bold mb-1 text-gray-700" htmlFor="companyName">
            Company Name:
          </label>
          <input
            id="companyName"
            type="text"
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="name">
              Teacher Name:
            </label>
            <select
              id="name"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              aria-required="true"
            >
              <option value="">Select a teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="title">
              Title:
            </label>
            <input
              id="title"
              type="text"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter job title"
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="schools">
              Schools (one per line):
            </label>
            <textarea
              id="schools"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 h-24"
              value={schools}
              onChange={(e) => setSchools(e.target.value)}
              placeholder="Enter schools, one per line"
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="dateOfJoining">
              Date of Joining (YYYY-MM-DD):
            </label>
            <input
              id="dateOfJoining"
              type="date"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={dateOfJoining}
              onChange={(e) => setDateOfJoining(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="fromDate">
              From Date (YYYY-MM-DD):
            </label>
            <input
              id="fromDate"
              type="date"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="tillDate">
              Till Date (YYYY-MM-DD):
            </label>
            <input
              id="tillDate"
              type="date"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={tillDate}
              onChange={(e) => setTillDate(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="basicSalary">
              Basic Salary (PKR):
            </label>
            <input
              id="basicSalary"
              type="number"
              min="0"
              step="0.01"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={basicSalary}
              onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
              placeholder="Enter basic salary"
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="paymentDate">
              Payment Date (YYYY-MM-DD):
            </label>
            <input
              id="paymentDate"
              type="date"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="bankName">
              Bank Name:
            </label>
            <input
              id="bankName"
              type="text"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Enter bank name"
              aria-required="true"
            />
          </div>

          <div className="flex flex-col">
            <label className="font-bold mb-1 text-gray-700" htmlFor="accountNumber">
              Account Number:
            </label>
            <input
              id="accountNumber"
              type="text"
              className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              aria-required="true"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="font-bold mb-1 text-gray-700">Additional Earnings:</label>
          {earnings.map((earning, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                className="p-2 border rounded-lg flex-1"
                value={earning.category}
                onChange={(e) => updateEarning(index, 'category', e.target.value)}
                placeholder="Category (e.g., Bonus)"
              />
              <input
                type="number"
                className="p-2 border rounded-lg flex-1"
                value={earning.amount}
                onChange={(e) => updateEarning(index, 'amount', e.target.value)}
                placeholder="Amount"
              />
              <button onClick={() => removeEarning(index)} className="bg-red-500 text-white px-2 py-1 rounded">Remove</button>
            </div>
          ))}
          <button onClick={addEarning} className="bg-green-500 text-white px-4 py-2 rounded mt-2">Add Earning</button>
        </div>

        <div className="flex flex-col">
          <label className="font-bold mb-1 text-gray-700">Deductions:</label>
          {deductions.map((deduction, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                className="p-2 border rounded-lg flex-1"
                value={deduction.category}
                onChange={(e) => updateDeduction(index, 'category', e.target.value)}
                placeholder="Category (e.g., Loan)"
              />
              <input
                type="number"
                className="p-2 border rounded-lg flex-1"
                value={deduction.amount}
                onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                placeholder="Amount"
              />
              <button onClick={() => removeDeduction(index)} className="bg-red-500 text-white px-2 py-1 rounded">Remove</button>
            </div>
          ))}
          <button onClick={addDeduction} className="bg-green-500 text-white px-4 py-2 rounded mt-2">Add Deduction</button>
        </div>

        <div className="flex flex-col">
          <label className="font-bold mb-1 text-gray-700" htmlFor="lineSpacing">
            Line Spacing:
          </label>
          <select
            id="lineSpacing"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(e.target.value)}
            className="p-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="single">Single</option>
            <option value="1.5">1.5</option>
            <option value="double">Double</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1 flex flex-col">
          <h3 className="font-bold mb-1 text-gray-700">Calculated Values:</h3>
          <p>No of Days: {noOfDays === 31 ? `${noOfDays} (normalized to 30 for calculation)` : noOfDays}</p>
          <p>Prorated Salary: {formatCurrency(proratedSalary)}</p>
          <p>Total Earning: {formatCurrency(totalEarning)}</p>
          <p>Total Deduction: {formatCurrency(totalDeduction)}</p>
          <p>Net Pay: {formatCurrency(netPay)}</p>
        </div>

        <div className="flex-1 flex flex-col">
          <h3 className="font-bold mb-1 text-gray-700">Preview:</h3>
          <div
            className="p-4 bg-white border rounded-lg h-96 overflow-y-auto font-sans text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderPreview({
                companyName,
                name,
                title,
                schools,
                dateOfJoining,
                fromDate,
                tillDate,
                basicSalary,
                paymentDate,
                bankName,
                accountNumber,
                noOfDays,
                proratedSalary,
                earnings: [{category: 'Salary', amount: proratedSalary}, ...earnings],
                deductions,
                totalEarning,
                totalDeduction,
                netPay,
              }),
            }}
          />
        </div>
      </div>

      <button
        onClick={handleGenerateSlip}
        className={`bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 ${
          isGenerating ? "opacity-75 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
        disabled={isGenerating}
        aria-label={isGenerating ? "Generating salary slip" : "Generate salary slip"}
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </>
        ) : (
          <>📄 Generate Salary Slip</>
        )}
      </button>
    </div>
  );
};

export default SalarySlip;