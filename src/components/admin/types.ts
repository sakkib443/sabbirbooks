// Shared admin domain types. These mirror the backend interfaces/models but
// only include the fields the admin UI reads. In list responses `category`
// and `mentor` on a Course arrive as raw ObjectId strings (unpopulated).

export type CourseType = "Online" | "Offline" | "Recorded";
export type PublishStatus = "draft" | "published" | "archived";
export type QrStatus = "draft" | "published";

export interface Category {
  _id: string;
  id: number;
  name: string;
  createdAt?: string;
}

export interface Mentor {
  _id: string;
  id: string;
  name: string;
  email?: string;
  phone?: string;
  designation: string;
  subject: string;
  specialized_area?: string[];
  education_qualification?: string[];
  work_experience?: string[];
  training_experience?: { years: string; students: string };
  image: string;
  details?: string;
  lifeJourney?: string;
  isPublished?: boolean;
  createdAt?: string;
}

export interface CourseInclude {
  icon: string;
  text: string;
}

export interface Course {
  _id: string;
  id: number;
  title: string;
  slug: string;
  category: string; // ObjectId string in list responses
  type: CourseType;
  status?: PublishStatus;
  image: string;
  fee: string;
  offerPrice?: string;
  admissionFee?: number;
  rating?: number;
  totalRating?: number;
  totalStudentsEnroll?: number;
  mentor: string; // ObjectId string in list responses
  technology: string;
  courseStart?: string;
  durationMonth?: number;
  curriculum?: string[];
  lectures?: number;
  totalExam?: number;
  totalProject?: number;
  details?: string;
  courseOverview?: string;
  courseIncludes?: CourseInclude[];
  softwareYoullLearn?: string[];
  jobPositions?: string[];
  createdAt?: string;
}

export interface Book {
  _id: string;
  id: number;
  title: string;
  slug: string;
  author: string;
  description: string;
  coverImage: string;
  price: number;
  offerPrice?: number;
  category: string;
  language: "bn" | "en" | "both";
  format: "printed" | "digital";
  stock?: number;
  secureFileUrl?: string;
  previewImages?: string[];
  previewPdfUrl?: string;
  status?: PublishStatus;
  isFeatured?: boolean;
  rating?: number;
  totalSold?: number;
  createdAt?: string;
}

export type QrBlockType = "text" | "image" | "video";

export interface QrBlock {
  type: QrBlockType;
  value: string;
  caption?: string;
}

export interface QrResource {
  _id: string;
  slug: string;
  book?: string;
  bookTitle?: string;
  questionNo: string | number;
  questionText?: string;
  title: string;
  blocks?: QrBlock[];
  status?: QrStatus;
  views?: number;
  createdAt?: string;
}

export interface OrderItem {
  book: string;
  title: string;
  price: number;
  quantity: number;
  format: "printed" | "digital";
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "access-granted"
  | "cancelled";

export interface Order {
  _id: string;
  orderNumber: string;
  user?: { _id?: string; name?: string; firstName?: string; lastName?: string; email?: string } | string;
  items: OrderItem[];
  deliveryType?: "printed" | "digital" | "mixed";
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  total: number;
  payment?: { method?: string; status?: string; transactionId?: string };
  status: OrderStatus;
  createdAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  minPurchase?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied";
  createdAt?: string;
}
