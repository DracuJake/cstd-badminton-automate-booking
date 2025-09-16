const axios = require("axios");
const readline = require("readline");
// Base URL for your API
const baseUrl = "https://cstd.bangkok.go.th";

const courts = [
  {
    ID: "f1b7131d-2f81-42d6-8291-650da2d1c67b",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 1",
  },
  {
    ID: "341741b4-9328-476c-85a7-8246b3ea9c39",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 2",
  },
  {
    ID: "31db3d2b-f02e-4fea-8b8a-e93951a6ca3f",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 3",
  },
  {
    ID: "f52fbb82-d9f4-407a-9e6c-21bae304c761",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 4",
  },
  {
    ID: "b9eb4160-d221-4e16-a6f8-ac2e9577bc44",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 5",
  },
  {
    ID: "b3e07eb1-c7da-4715-a077-8d46519bebdb",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 6",
  },
  {
    ID: "4b096840-aed6-458d-b1a1-8291b87e9525",
    TITLE: "สนามแบดมินตัน แบดมินตัน สนาม 7",
  },
];

const axiosInstance = axios.create({
  baseURL: baseUrl,
});

function minusOneDate(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // เดือนเริ่มจาก 0
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getUserData(id) {
    try {
      const loginResponse = await axiosInstance.post(
        "/card-service/api/card/register/validate",
        {
          "CID": id,
          "TYPE": "GUEST"
        },
      );
      const userData = loginResponse.data;
      const accountId = userData.auth_info.account_id;
      const token = userData.auth_info.token;
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axiosInstance.get(
        `/app-service/api/account/${accountId}/card`
      );
      const data = response.data[0];
      const firstName = data.card_info.first_name.value;
      const lastName = data.card_info.last_name.value;
      const title = data.card_info.title.value;
      const cardId = data.card_id;
      // Logging the message
      console.log(`${title} ${firstName} ${lastName} is booking`);
      return cardId;
    } catch (error) {
      console.error("Error fetching data error:", error.message);
      throw error;
    }
  }

// Function to get available slots for a court
async function getAvailableSlots(courtId, bookingDate) {
  try {
    const response = await axiosInstance.get(
      `/reservation/api/reservation/item/${courtId}/slot`,
      {
        params: {
          IS_GUEST: "true",
          BOOKING_DATE: bookingDate,
        },
      }
    );
    // Filter out the full slots and return the available ones
    return response.data.filter((slot) => !slot.IS_FULL);
  } catch (error) {
    console.error("Error fetching available slots:", error.message);
    throw error;
  }
}

// Function to book a slot
async function bookSlot(slotId, bookingTitle, bookingDate,cardId) {
  try {
    const response = await axiosInstance.post(
      "/reservation/api/reservation/booking?lang=th&IS_GUEST=true",
      {
        BOOKING_DATE: bookingDate,
        SLOT_ID: slotId,
        BOOKING_TITLE: bookingTitle,
        BOOKER_ID: cardId,
      }
    );
    if (response.status === 200) {
      console.log("Booking successful");
      return true;
    } else {
      console.error("Booking failed");
      return false;
    }
  } catch (error) {
    console.error("Error booking slot:", error.message);
    return false;
  }
}

// Main function to check the selected court and make a booking
async function bookBadmintonCourt() {
    const inputData = await getInputData();
    const cardId = await getUserData(inputData.id);
    const targetTime = new Date(`${inputData.bookingDate} 06:00:00`);
    let bookingSuccess = false;

    const targetCourt = courts[inputData.courtNumber - 1]; 
    const availableSlots = await getAvailableSlots(targetCourt.ID, inputData.bookingDate);
    const matchingSlot = availableSlots.find(slot => slot.START_TIME === inputData.desiredTime);
    const slotId = matchingSlot.ID;
    console.log(`ระบบจะเริ่มจองในวันที่ ${minusOneDate(inputData.bookingDate)} 06:00:00`);
    while (!bookingSuccess) {
      const currentTime = new Date();
      currentTime.setDate(currentTime.getDate()+1);
      if (currentTime >= targetTime && currentTime <= new Date(targetTime.getTime() + 60000)) {
        // Book the slot
        bookingSuccess = await bookSlot(slotId, `${targetCourt.TITLE}`, inputData.bookingDate,cardId);
        if (bookingSuccess) {
          break; 
        }
      }
  
      // If booking is not successful, retry after 1 second
      if (!bookingSuccess) {
        // console.log('Trying again...',currentTime);
        await new Promise(resolve => setTimeout(resolve, 1000)); 
      }
  
      // Stop if the current time has passed 06:01:00
      const stopTime = new Date(`${inputData.bookingDate} 06:01:00`);
      if (currentTime > stopTime) {
        console.log('Time has passed 06:01:00. Stopping the booking attempt.');
        break;
      }
    }
  }



async function getInputData() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise(resolve => rl.question(question, resolve));

  try {
    const id = await ask("กรุณากรอกเลขบัตรประชาชน (13 หลัก): ");
    if (!/^\d{13}$/.test(id)) {
      throw new Error("เลขบัตรประชาชนไม่ถูกต้อง (ต้องมี 13 หลัก)");
    }

    const courtNumber = parseInt(await ask("กรุณากรอกหมายคอร์ด (1-7): "), 10);
    if (isNaN(courtNumber) || courtNumber < 1 || courtNumber > 7) {
      throw new Error("หมายเลขศาลต้องอยู่ระหว่าง 1 ถึง 7");
    }

    const bookingDate = await ask("กรุณากรอกวันที่จอง (yyyy-mm-dd): ");
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(bookingDate)) {
      throw new Error("รูปแบบวันที่ไม่ถูกต้อง (ควรเป็น yyyy-mm-dd)");
    }

    const desiredTime = await ask("กรุณากรอกเวลาที่ต้องการ (เช่น ต้องการจอง 2-3 ทุ่ม ให้กรอก 20:00:00): ");
    const timePattern = /^\d{2}:\d{2}:\d{2}$/;
    if (!timePattern.test(desiredTime)) {
      throw new Error("รูปแบบเวลาไม่ถูกต้อง (ควรเป็น HH:mm:ss เช่น 08:00:00)");
    }

    // ตรวจสอบว่าเวลาอยู่ในช่วง 06:00:00–21:00:00
    const [h, m, s] = desiredTime.split(":").map(Number);
    const seconds = h * 3600 + m * 60 + s;
    const min = 6 * 3600;   // 06:00:00
    const max = 21 * 3600;  // 21:00:00
    if (seconds < min || seconds > max) {
      throw new Error("เวลาต้องอยู่ระหว่าง 06:00:00 ถึง 21:00:00 เท่านั้น");
    }
    rl.close();

    return { id, courtNumber, bookingDate, desiredTime };
  } catch (err) {
    rl.close();
    throw err;
  }
}


bookBadmintonCourt();
