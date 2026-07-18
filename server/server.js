import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to read DB
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return { users: [], weeks: [], submissions: [], notifications: [] };
  }
}

// Helper function to write DB
async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// ==========================================
// 1. AUTHENTICATION & PROFILE APIS
// ==========================================

// Trainee Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, level } = req.body;
  if (!name || !level) {
    return res.status(400).json({ error: "برجاء كتابة الاسم واختيار المستوى ⚠️" });
  }

  const db = await readDB();
  const existingUser = db.users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
  
  if (existingUser) {
    return res.status(400).json({ error: "هذا الاسم مسجل بالفعل! برجاء استخدام اسم مختلف أو تسجيل الدخول." });
  }

  // Check if trying to register as coach
  if (name.trim() === 'مينا' || name.trim() === 'الكوتش مينا') {
    return res.status(400).json({ error: "لا يمكن تسجيل هذا الاسم كمتدرب. برجاء استخدامه في تسجيل دخول الكوتش." });
  }

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    level, // beginner, intermediate, advanced
    currentWeek: 1,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  await writeDB(db);

  // Send welcome notification
  const welcomeNotification = {
    id: uuidv4(),
    userId: newUser.id,
    title: "مرحباً بك في فريق الرؤية! 🚀🎬",
    message: `يا هلا بك يا بطل! تم تسجيلك بنجاح بمستوى (${level === 'beginner' ? 'مبتدئ 🟢' : level === 'intermediate' ? 'متوسط 🟡' : 'متقدم 🔴'}). أسبوعك الأول مفتوح الآن، ابدأ بمشاهدة الدروس وتسليم التاسك قبل يوم الجمعة 11:59 مساءً! 🔥`,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(welcomeNotification);
  await writeDB(db);

  res.status(201).json(newUser);
});

// General Login (Trainee and Coach)
app.post('/api/auth/login', async (req, res) => {
  const { name, passcode, isCoach } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "برجاء كتابة الاسم لتسجيل الدخول ⚠️" });
  }

  const db = await readDB();

  // If attempting Coach Login
  if (isCoach || name.trim() === 'مينا' || name.trim() === 'الكوتش مينا') {
    if (passcode === '1234') { // Predefined simple passcode
      return res.json({
        id: 'coach_mina_admin',
        name: 'الكوتش مينا',
        isCoach: true
      });
    } else {
      return res.status(401).json({ error: "رمز المرور الخاص بالكوتش غير صحيح! ❌" });
    }
  }

  // Trainee Login
  const user = db.users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "الاسم غير مسجل! برجاء إنشاء حساب جديد أولاً ⚠️" });
  }

  res.json(user);
});

// Get User Profile
app.get('/api/users/:id', async (req, res) => {
  const db = await readDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "المتدرب غير موجود!" });
  }
  res.json(user);
});

// ==========================================
// 2. TRAINEE DASHBOARD APIS
// ==========================================

// Get weeks metadata (and mark access block)
app.get('/api/weeks', async (req, res) => {
  const db = await readDB();
  // Sort weeks by weekNumber
  const sortedWeeks = db.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  res.json(sortedWeeks);
});

// Submit weekly task
app.post('/api/trainee/submit', async (req, res) => {
  const { userId, weekNumber, submissionUrl, notes } = req.body;

  if (!userId || !weekNumber || !submissionUrl) {
    return res.status(400).json({ error: "برجاء ملء جميع الحقول المطلوبة ورابط التاسك! ⚠️" });
  }

  const db = await readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "المتدرب غير موجود!" });
  }

  // Verify that trainee is allowed to submit this week
  if (weekNumber > user.currentWeek) {
    return res.status(403).json({ error: "عذراً! هذا الأسبوع مغلق بالنسبة لك حالياً." });
  }

  // Check if they already have a pending submission for this week
  const existingPending = db.submissions.find(
    s => s.userId === userId && s.weekNumber === parseInt(weekNumber) && s.status === 'pending'
  );

  if (existingPending) {
    return res.status(400).json({ error: "لديك تسليم قيد المراجعة بالفعل لهذا الأسبوع. انتظر تقييم الكوتش! ⏳" });
  }

  const newSubmission = {
    id: uuidv4(),
    userId,
    userName: user.name,
    userEmail: user.email || 'no-email', // keeping field structure but using placeholder as requested
    weekNumber: parseInt(weekNumber),
    submissionUrl,
    notes: notes || '',
    status: 'pending',
    rejectionReason: '',
    submittedAt: new Date().toISOString()
  };

  db.submissions.push(newSubmission);
  await writeDB(db);

  res.status(201).json({ message: "تم إرسال التاسك للكوتش مينا بنجاح! 🚀🔥", submission: newSubmission });
});

// Get User Notifications
app.get('/api/trainee/notifications/:userId', async (req, res) => {
  const db = await readDB();
  const notifications = db.notifications
    .filter(n => n.userId === req.params.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(notifications);
});

// Mark notifications as read
app.post('/api/trainee/notifications/read', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing user ID" });

  const db = await readDB();
  db.notifications = db.notifications.map(n => {
    if (n.userId === userId) {
      return { ...n, isRead: true };
    }
    return n;
  });
  await writeDB(db);
  res.json({ message: "Notifications marked as read." });
});

// ==========================================
// 3. COACH ADMIN DASHBOARD APIS
// ==========================================

// Get Admin Overview Stats
app.get('/api/coach/stats', async (req, res) => {
  const db = await readDB();
  const totalTrainees = db.users.length;
  const pendingTasks = db.submissions.filter(s => s.status === 'pending').length;
  // Graduates are users who have currentWeek > 4 (or 5)
  const totalGraduates = db.users.filter(u => u.currentWeek > 4).length;
  
  // Get recent pending submissions (limit 5)
  const recentSubmissions = db.submissions
    .filter(s => s.status === 'pending')
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  res.json({
    totalTrainees,
    pendingTasks,
    totalGraduates,
    recentSubmissions
  });
});

// Get all trainees (with search)
app.get('/api/coach/trainees', async (req, res) => {
  const { search } = req.query;
  const db = await readDB();
  let trainees = db.users;

  if (search) {
    const q = search.toString().toLowerCase();
    trainees = trainees.filter(t => t.name.toLowerCase().includes(q));
  }

  res.json(trainees);
});

// Get all submissions for review
app.get('/api/coach/submissions', async (req, res) => {
  const db = await readDB();
  const sortedSubmissions = db.submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(sortedSubmissions);
});

// Review Submission (Approve / Reject)
app.post('/api/coach/submissions/:id/review', async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body; // status: 'approved' | 'rejected'

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "الحالة المرسلة غير صالحة ⚠️" });
  }

  const db = await readDB();
  const subIdx = db.submissions.findIndex(s => s.id === id);
  if (subIdx === -1) {
    return res.status(404).json({ error: "التسليم غير موجود!" });
  }

  const submission = db.submissions[subIdx];
  const user = db.users.find(u => u.id === submission.userId);

  if (!user) {
    return res.status(404).json({ error: "المستخدم صاحب هذا التاسك غير موجود!" });
  }

  if (status === 'approved') {
    submission.status = 'approved';
    
    // Promote user if they approved the week they are currently working on
    if (user.currentWeek === submission.weekNumber) {
      user.currentWeek += 1; // Move to next week (Week 5 represents Graduated)
    }

    const notification = {
      id: uuidv4(),
      userId: user.id,
      title: "عاش يا بطل! تم قبول التاسك 🎉🔥",
      message: `الكوتش مينا وافق على تاسك الأسبوع ${submission.weekNumber} بعد مراجعته ودراسته. تم ترقيتك للأسبوع التالي بنجاح! كمل إبداعك يا بطل! 🚀`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(notification);

  } else if (status === 'rejected') {
    submission.status = 'rejected';
    submission.rejectionReason = rejectionReason || 'برجاء مراجعة هندسة الصوت والقطع والالتزام بالتوجيهات.';

    // DEMOTE USER back to Week 1! "يعيده من الأول خالص"
    user.currentWeek = 1;

    const notification = {
      id: uuidv4(),
      userId: user.id,
      title: "الكوتش قرر يرجعك للأسبوع الأول! 🫣🔥",
      message: `الكوتش مينا قرر يرجعك للأسبوع الأول علشان تعيد التركيز! السبب: ${submission.rejectionReason} 🎬`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(notification);
  }

  await writeDB(db);
  res.json({ message: "تم تسجيل التقييم بنجاح!", user, submission });
});

// ==========================================
// 4. WEEK & LESSON EDITING APIS (COACH ONLY)
// ==========================================

// Add a new week
app.post('/api/weeks/manage', async (req, res) => {
  const { title, description, playlistUrl, taskMaterialsUrl } = req.body;
  if (!title) return res.status(400).json({ error: "العنوان مطلوب لإضافة أسبوع جديد!" });

  const db = await readDB();
  const nextWeekNum = db.weeks.length > 0 ? Math.max(...db.weeks.map(w => w.weekNumber)) + 1 : 1;

  const newWeek = {
    weekNumber: nextWeekNum,
    title,
    description: description || '',
    playlistUrl: playlistUrl || '',
    taskMaterialsUrl: taskMaterialsUrl || '',
    videos: []
  };

  db.weeks.push(newWeek);
  await writeDB(db);
  res.status(201).json(newWeek);
});

// Edit specific week
app.put('/api/weeks/manage/:weekNumber', async (req, res) => {
  const weekNum = parseInt(req.params.weekNumber);
  const { title, description, playlistUrl, taskMaterialsUrl, videos } = req.body;

  const db = await readDB();
  const weekIdx = db.weeks.findIndex(w => w.weekNumber === weekNum);
  if (weekIdx === -1) {
    return res.status(404).json({ error: "الأسبوع غير موجود!" });
  }

  db.weeks[weekIdx] = {
    ...db.weeks[weekIdx],
    title: title || db.weeks[weekIdx].title,
    description: description !== undefined ? description : db.weeks[weekIdx].description,
    playlistUrl: playlistUrl !== undefined ? playlistUrl : db.weeks[weekIdx].playlistUrl,
    taskMaterialsUrl: taskMaterialsUrl !== undefined ? taskMaterialsUrl : db.weeks[weekIdx].taskMaterialsUrl,
    videos: videos !== undefined ? videos : db.weeks[weekIdx].videos
  };

  await writeDB(db);
  res.json(db.weeks[weekIdx]);
});

// Delete specific week
app.delete('/api/weeks/manage/:weekNumber', async (req, res) => {
  const weekNum = parseInt(req.params.weekNumber);
  const db = await readDB();
  
  const initialLen = db.weeks.length;
  db.weeks = db.weeks.filter(w => w.weekNumber !== weekNum);
  
  if (db.weeks.length === initialLen) {
    return res.status(404).json({ error: "الأسبوع غير موجود!" });
  }

  // Re-adjust week numbers to be contiguous
  db.weeks = db.weeks
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((w, index) => ({ ...w, weekNumber: index + 1 }));

  await writeDB(db);
  res.json({ message: "تم حذف الأسبوع وإعادة ترتيب الأسابيع بنجاح." });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
