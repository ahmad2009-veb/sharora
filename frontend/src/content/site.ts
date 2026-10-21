/**
 * Static content of the public site. The home page is fully static (SSG) and reads
 * only from this file — it never calls the API.
 *
 * Every user-facing string is a `Localized` value. `tg` (Tajik) is optional:
 * when it is missing the Russian text is shown.
 * TODO(tg): fill in the remaining Tajik translations (search for entries without `tg`).
 */
import type { Locale } from "@/i18n/routing";

export type Localized = { ru: string; tg?: string };

export function tr(value: Localized, locale: Locale): string {
  return (locale === "tg" && value.tg) || value.ru;
}

/** WhatsApp chat with a prefilled (URL-encoded) message. */
export function whatsappLink(text: string): string {
  return `https://wa.me/${site.contact.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/** Telegram chat; `text` becomes the draft where the Telegram client supports it. */
export function telegramLink(text: string): string {
  return `${site.contact.telegram}?text=${encodeURIComponent(text)}`;
}

export type FeatureIcon = "sun" | "flame" | "baby" | "mapPin" | "store" | "school" | "building";

export const site = {
  brand: {
    name: "Zarafshon Sokhtmon",
    project: { ru: "ЖК «Зарафшон»", tg: "МИ «Зарафшон»" } satisfies Localized,
    logo: "/logo.svg",
  },

  contact: {
    phoneDisplay: "+992 20 643 1001",
    phoneHref: "tel:+992206431001",
    phoneNote: {
      ru: "Ответственное лицо — звоните для связи",
      tg: "Шахси масъул — барои тамос занг занед",
    } satisfies Localized,
    // Messengers: change the number / username here only — links are built from these.
    whatsappNumber: "992206431001",
    whatsapp: "https://wa.me/992206431001",
    telegram: "https://t.me/+992206431001", // TODO: replace with the company's Telegram username
    hours: { ru: "Пн–Сб, 9:00–18:00", tg: "Дш–Шн, 9:00–18:00" } satisfies Localized,
    greeting: {
      ru: "Здравствуйте! Хочу узнать о квартирах в ЖК «Зарафшон».",
      tg: "Ассалому алейкум! Мехоҳам дар бораи хонаҳои МИ «Зарафшон» маълумот гирам.",
    } satisfies Localized,
    /** `{unit}` → "Хонаи 2, Блок 1, Этаж 2, 75.00 м²" */
    unitGreeting: {
      ru: "Здравствуйте! Интересует {unit}.",
      tg: "Ассалому алейкум! Ба ман {unit} маъқул аст.",
    } satisfies Localized,
    // TODO(client): add the street once known.
    address: {
      ru: "Согдийская область, Айнинский район, пос. Айни",
      tg: "Вилояти Суғд, ноҳияи Айнӣ, шаҳраки Айнӣ",
    } satisfies Localized,
    distance: { ru: "100 км от Душанбе", tg: "100 км аз Душанбе" } satisfies Localized,
    // TODO(client): pin the exact construction site; this is the centre of Ayni.
    map: { lat: 39.39, lon: 68.54 },
  },

  nav: [
    { href: "/", label: { ru: "Главная", tg: "Асосӣ" } },
    { href: "/#about", label: { ru: "О проекте", tg: "Дар бораи лоиҳа" } },
    { href: "/#features", label: { ru: "Преимущества", tg: "Бартариятҳо" } },
    { href: "/#interior", label: { ru: "Интерьер", tg: "Тарҳи дохилӣ" } },
    { href: "/#documents", label: { ru: "Документы", tg: "Ҳуҷҷатҳо" } },
    { href: "/apartments", label: { ru: "Квартиры", tg: "Хонаҳо" }, highlight: true },
    { href: "/#contacts", label: { ru: "Контакты", tg: "Тамос" } },
  ] satisfies { href: string; label: Localized; highlight?: boolean }[],

  actions: {
    chooseApartment: { ru: "Выбрать квартиру", tg: "Интихоби хона" } satisfies Localized,
    call: { ru: "Позвонить", tg: "Занг задан" } satisfies Localized,
    feedback: { ru: "Предложение или жалоба", tg: "Пешниҳод ё шикоят" } satisfies Localized,
    menu: { ru: "Меню", tg: "Меню" } satisfies Localized,
    close: { ru: "Закрыть", tg: "Пӯшидан" } satisfies Localized,
  },

  hero: {
    eyebrow: { ru: "Zarafshon Sokhtmon · Зарафшон" } satisfies Localized,
    badge: {
      ru: "Новый жилой комплекс · 100 км от Душанбе",
      tg: "Маҷмааи нави истиқоматӣ · 100 км аз Душанбе",
    } satisfies Localized,
    titleLines: [
      { ru: "Жилой комплекс", tg: "Маҷмааи истиқоматии" },
      { ru: "«Зарафшон»", tg: "Зарафшон" },
    ] satisfies Localized[],
    salesNote: {
      ru: "Открыты продажи — 2 блока",
      tg: "Фурӯш кушода аст — 2 блок",
    } satisfies Localized,
    title: {
      ru: "Жилой комплекс «Зарафшон»",
      tg: "Маҷмааи истиқоматии Зарафшон",
    } satisfies Localized,
    subtitle: {
      ru: "Широкие дороги, магазины на первом этаже и всё необходимое для комфортной современной жизни.",
    } satisfies Localized,
    // TODO(client): renders from the design mock-up — replace with the project's own visuals.
    // Real-ESRGAN x4 upscale of renders/hero-building.jpg (kept as the source), graded and
    // exported as AVIF/WebP at these widths; Vercel serves public/ unoptimized, so the
    // responsive set is pre-built. Regenerate all files if the render changes.
    image: {
      base: "/renders/hero/hero",
      widths: [1280, 1920, 2560],
      width: 2560,
      height: 1863,
      blurDataURL:
        "data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAAAwBACdASoYABEAPsFMn0unpCKht/qoAPAYCWMAAFFO6tg+UtRIiF+fxAAA/cL8Hnr/prCbXZZudW26Wv1jopkW8BTKYPxppVAdymkAxpIMkoeH/NChHfiZRHQy4SQTc5l7Avv2a1tHHbzbaAPAwAAA",
    },
    imageAlt: {
      ru: "Вид на жилой дом комплекса «Зарафшон» с коммерческими помещениями на первом этаже",
    } satisfies Localized,
    facts: [
      {
        value: "2",
        label: { ru: "блока", tg: "блок" },
        text: {
          ru: "Блок 1 и Блок 2, по одному подъезду",
          tg: "Блоки 1 ва Блоки 2, ҳар кадом як даромадгоҳ",
        },
      },
      {
        value: "9",
        label: { ru: "этажей", tg: "ошёна" },
        text: {
          ru: "Магазины на 1-м этаже, по 7 квартир на 2–9 этажах",
          tg: "Мағозаҳо дар ошёнаи 1, дар ошёнаҳои 2–9 ҳар кадом 7 хона",
        },
      },
      {
        value: "100 км",
        label: { ru: "от Душанбе", tg: "аз Душанбе" },
        text: {
          ru: "Айнинский район, Согдийская область",
          tg: "Ноҳияи Айнӣ, вилояти Суғд",
        },
      },
      {
        value: "1",
        label: { ru: "детский сад", tg: "боғча" },
        text: { ru: "Свой детский сад на территории", tg: "Боғчаи бачагона дар ҳудуди маҳалла" },
      },
    ] satisfies { value: string; label: Localized; text: Localized }[],
  },

  about: {
    eyebrow: { ru: "О проекте", tg: "Дар бораи лоиҳа" } satisfies Localized,
    title: {
      ru: "Комфорт начинается здесь",
      tg: "Роҳат аз ин ҷо оғоз мешавад",
    } satisfies Localized,
    paragraphs: [
      {
        ru: "Современный жилой комплекс в Айнинском районе состоит из 2 жилых блоков по 9 этажей, созданных для комфортной и современной жизни.",
      },
      {
        ru: "На первом этаже расположатся магазины и объекты сферы услуг, чтобы всё необходимое было рядом с вашим домом.",
      },
      {
        ru: "Это не просто жилой комплекс — это пространство для комфортной жизни, безопасности и уверенного будущего.",
      },
    ] satisfies Localized[],
    image: "/renders/about.jpg",
    imageAlt: {
      ru: "Двор с фонтаном и фасады жилых блоков комплекса «Зарафшон»",
    } satisfies Localized,
    developerLabel: { ru: "Застройщик", tg: "Сохтмончӣ" } satisfies Localized,
    safety: { ru: "Безопасность", tg: "Амният" } satisfies Localized,
    safetyText: {
      ru: "Закрытые дворы и видеонаблюдение",
      tg: "Ҳавлиҳои пӯшида ва назорати видеоӣ",
    } satisfies Localized,
    specs: [
      { icon: "sun", label: { ru: "Солнечные панели", tg: "Панелҳои офтобӣ" } },
      { icon: "flame", label: { ru: "Своя котельная", tg: "Дегхонаи худӣ" } },
      { icon: "store", label: { ru: "Магазины рядом", tg: "Мағозаҳо дар наздикӣ" } },
    ] satisfies { icon: FeatureIcon; label: Localized }[],
    responsible: { ru: "Ответственное лицо", tg: "Шахси масъул" } satisfies Localized,
    addressLabel: { ru: "Адрес", tg: "Суроға" } satisfies Localized,
  },

  genplan: {
    eyebrow: { ru: "Блоки", tg: "Блокҳо" } satisfies Localized,
    title: {
      ru: "Выберите блок",
      tg: "Блокро интихоб кунед",
    } satisfies Localized,
    subtitle: {
      ru: "Два 9-этажных блока: магазины на первом этаже, по 7 квартир на этажах 2–9. Выберите блок — откроется выбор этажа и квартиры.",
    } satisfies Localized,
    // Phones and devices without WebGL get this render with two block buttons instead of 3D.
    fallbackImage: "/renders/hero/hero-1280.webp",
    fallbackAlt: {
      ru: "Жилой комплекс «Зарафшон»: Блок 1 и Блок 2",
    } satisfies Localized,
    blocks: [{ letter: "1" }, { letter: "2" }],
    blockLabel: { ru: "Блок", tg: "Блоки" } satisfies Localized,
    selected: { ru: "Выбранный блок", tg: "Блоки интихобшуда" } satisfies Localized,
    onSale: { ru: "В продаже", tg: "Дар фурӯш" } satisfies Localized,
    soldOut: { ru: "Всё продано", tg: "Ҳама фурӯхта шуд" } satisfies Localized,
    freeLabel: { ru: "Свободно", tg: "Озод" } satisfies Localized,
    floorsLabel: { ru: "Этажей", tg: "Ошёнаҳо" } satisfies Localized,
    areaLabel: { ru: "Площади", tg: "Масоҳатҳо" } satisfies Localized,
    soldLabel: { ru: "Реализовано", tg: "Фурӯхта шуд" } satisfies Localized,
    openBlock: { ru: "Квартиры блока", tg: "Хонаҳои блоки" } satisfies Localized,
    quickJump: {
      ru: "Быстрый переход по блокам",
      tg: "Гузариши зуд ба блокҳо",
    } satisfies Localized,
    noData: { ru: "Данные о наличии обновляются", tg: "Маълумот нав мешавад" } satisfies Localized,
    modelHint: {
      ru: "3D-модель · нажмите на блок",
      tg: "Модели 3D · блокро пахш кунед",
    } satisfies Localized,
  },

  features: {
    eyebrow: { ru: "Преимущества и инженерия", tg: "Бартариятҳо ва муҳандисӣ" } satisfies Localized,
    title: { ru: "Продумано до инженерных сетей" } satisfies Localized,
    subtitle: {
      ru: "Своя энергия и тепло — комплекс не зависит от городских перебоев.",
    } satisfies Localized,
    items: [
      {
        icon: "sun",
        title: { ru: "Солнечная энергия — шаг в будущее" },
        text: {
          ru: "На крыше комплекса будут установлены солнечные панели, обеспечивающие электроэнергией лифты, внутреннее и наружное освещение и другие коммунальные системы — энергоэффективность и экологичность.",
        },
      },
      {
        icon: "flame",
        title: { ru: "Центральная система отопления" },
        text: {
          ru: "Собственная котельная на территории; по современной инженерной сети теплоноситель подаётся в каждую квартиру — стабильное и эффективное отопление.",
        },
      },
      {
        icon: "baby",
        title: { ru: "Детская площадка", tg: "Майдончаи бачагона" },
        text: {
          ru: "Современная, безопасная площадка для игр, активного отдыха и развития детей.",
        },
      },
      {
        icon: "mapPin",
        title: { ru: "100 км от Душанбе", tg: "100 км аз Душанбе" },
        text: {
          ru: "Айнинский район Согдийской области — спокойная атмосфера вдали от городского шума.",
        },
      },
      {
        icon: "store",
        title: { ru: "Торговые и сервисные центры" },
        text: { ru: "Магазины и услуги на первых этажах — всё рядом с домом." },
      },
      {
        icon: "school",
        title: { ru: "Детский сад", tg: "Боғчаи бачагона" },
        text: {
          ru: "На территории комплекса — безопасные условия для воспитания, обучения и развития детей.",
        },
      },
    ] satisfies {
      icon: FeatureIcon;
      title: Localized;
      text: Localized;
    }[],
    closing: {
      ru: "Это не просто жилой комплекс — это новое пространство для жизни, комфорта и будущего.",
    } satisfies Localized,
  },

  interior: {
    eyebrow: { ru: "Дизайн интерьера", tg: "Тарҳи дохилӣ" } satisfies Localized,
    title: { ru: "Пространство, в котором хочется жить" } satisfies Localized,
    subtitle: { ru: "Рендеры интерьеров квартир комплекса." } satisfies Localized,
    // TODO(client): renders from the design mock-up — replace with the project's interiors.
    images: [
      {
        src: "/renders/int1.jpg",
        tag: { ru: "Гостиная", tg: "Меҳмонхона" },
        alt: { ru: "Гостиная с панорамными окнами на горы" },
      },
      {
        src: "/renders/int2.jpg",
        tag: { ru: "Кухня-столовая", tg: "Ошхона" },
        alt: { ru: "Кухня с мраморным островом" },
      },
      {
        src: "/renders/int3.jpg",
        tag: { ru: "Спальня", tg: "Ҳуҷраи хоб" },
        alt: { ru: "Спальня с гардеробной системой" },
      },
      {
        src: "/renders/int4.jpg",
        tag: { ru: "Ванная", tg: "Ҳаммом" },
        alt: { ru: "Ванная комната с видом на долину" },
      },
      {
        src: "/renders/int5.jpg",
        tag: { ru: "Кабинет", tg: "Утоқи корӣ" },
        alt: { ru: "Кабинет с библиотекой" },
      },
      {
        src: "/renders/int6.jpg",
        tag: { ru: "Лобби", tg: "Даромадгоҳ" },
        alt: { ru: "Входная группа с ресепшен" },
      },
      {
        src: "/renders/show.jpg",
        tag: { ru: "Гостиная", tg: "Меҳмонхона" },
        alt: { ru: "Гостиная с выходом на террасу" },
      },
      {
        src: "/renders/terrace.jpg",
        tag: { ru: "Терраса", tg: "Айвон" },
        alt: { ru: "Терраса на закате с видом на горы" },
      },
      {
        src: "/renders/livingview.jpg",
        tag: { ru: "Салон", tg: "Толор" },
        alt: { ru: "Салон с камином и видом на горы" },
      },
    ] satisfies { src: string; tag: Localized; alt: Localized }[],
  },

  documents: {
    eyebrow: { ru: "Документы проекта", tg: "Ҳуҷҷатҳои лоиҳа" } satisfies Localized,
    title: { ru: "Строим открыто", tg: "Мо ошкоро месозем" } satisfies Localized,
    hint: {
      ru: "Нажмите на документ, чтобы посмотреть изображение и полную информацию.",
      tg: "Барои дидани тасвир ва маълумоти пурра ба ҳуҷҷат пахш кунед.",
    } satisfies Localized,
    pagesLabel: { ru: "стр.", tg: "саҳ." } satisfies Localized,
    verified: { ru: "Подтверждено", tg: "Тасдиқ шудааст" } satisfies Localized,
    open: { ru: "Открыть", tg: "Кушодан" } satisfies Localized,
    items: [
      {
        slug: "qaror",
        titleTj: "Қарори раиси шаҳр",
        titleRu: "Постановление председателя города",
        pages: 1,
      },
      { slug: "vakolatnoma", titleTj: "Ваколатнома", titleRu: "Доверенность", pages: 5 },
      {
        slug: "ijozatnoma-barq",
        titleTj: "Иҷозатномаи Қувваи Барқ",
        titleRu: "Разрешение на электроснабжение",
        pages: 1,
      },
      {
        slug: "ariza",
        titleTj: "Ариза барои иҷозатнома",
        titleRu: "Заявление на разрешение",
        pages: 1,
      },
      {
        slug: "shahodatnoma",
        titleTj: "Шаҳодатномаи лоиҳа",
        titleRu: "Свидетельство проекта",
        pages: 2,
      },
      {
        slug: "xulosa",
        titleTj: "Хулосаи Экспертиза",
        titleRu: "Заключение экспертизы",
        pages: 2,
      },
    ],
  },

  location: {
    eyebrow: { ru: "Расположение", tg: "Ҷойгиршавӣ" } satisfies Localized,
    title: { ru: "Айнинский район", tg: "Ноҳияи Айнӣ" } satisfies Localized,
    text: {
      ru: "Комплекс находится в Айнинском районе Согдийской области, в 100 км от Душанбе.",
      tg: "Маҷмаа дар ноҳияи Айнии вилояти Суғд, 100 км дуртар аз Душанбе ҷойгир аст.",
    } satisfies Localized,
    route: { ru: "Построить маршрут", tg: "Масир сохтан" } satisfies Localized,
    mapTitle: { ru: "Карта расположения ЖК «Зарафшон»" } satisfies Localized,
    pinLabel: { ru: "ЖК «Зарафшон»", tg: "МИ «Зарафшон»" } satisfies Localized,
    routeNote: {
      ru: "100 км от Душанбе",
      tg: "100 км аз Душанбе",
    } satisfies Localized,
  },

  cta: {
    badge: { ru: "Персональная консультация", tg: "Машварати шахсӣ" } satisfies Localized,
    title: {
      ru: "Найдите свою квартиру в «Зарафшон»",
      tg: "Хонаи худро дар «Зарафшон» ёбед",
    } satisfies Localized,
    text: {
      ru: "Выберите блок, этаж и планировку онлайн — или оставьте номер, и менеджер подберёт варианты и расскажет об условиях рассрочки.",
    } satisfies Localized,
    points: [
      { ru: "Рассрочка от застройщика без банка", tg: "Насия аз сохтмончӣ бе бонк" },
      {
        ru: "Свободные квартиры и цены — в реальном времени",
        tg: "Хонаҳои озод ва нархҳо — дар вақти воқеӣ",
      },
      { ru: "Документы проекта в открытом доступе", tg: "Ҳуҷҷатҳои лоиҳа ошкоро" },
    ] satisfies Localized[],
    formTitle: { ru: "Заявка на консультацию", tg: "Дархост барои машварат" } satisfies Localized,
    formText: {
      ru: "Менеджер перезвонит в рабочее время",
      tg: "Менеҷер дар вақти корӣ занг мезанад",
    } satisfies Localized,
    roomsLabel: { ru: "Интересует", tg: "Ба ман лозим" } satisfies Localized,
    roomOptions: [
      { value: "1", label: { ru: "1-комн.", tg: "1-ҳуҷра" } },
      { value: "2", label: { ru: "2-комн.", tg: "2-ҳуҷра" } },
      { value: "3", label: { ru: "3-комн.", tg: "3-ҳуҷра" } },
      { value: "4", label: { ru: "4-комн.", tg: "4-ҳуҷра" } },
      { value: "shop", label: { ru: "Коммерция", tg: "Тиҷоратӣ" } },
    ] satisfies { value: string; label: Localized }[],
    browse: { ru: "Смотреть все квартиры", tg: "Ҳамаи хонаҳоро дидан" } satisfies Localized,
  },

  footer: {
    rights: {
      ru: "© 2026 Zarafshon Sokhtmon. Все права защищены.",
      tg: "© 2026 Zarafshon Sokhtmon. Ҳамаи ҳуқуқҳо ҳифз шудаанд.",
    } satisfies Localized,
    sections: { ru: "Разделы", tg: "Бахшҳо" } satisfies Localized,
    contacts: { ru: "Контакты", tg: "Тамос" } satisfies Localized,
    about: {
      ru: "Новый жилой комплекс в Айнинском районе: 2 блока, своя инженерия и всё для жизни рядом с домом.",
      tg: "Маҷмааи нави истиқоматӣ дар ноҳияи Айнӣ: 2 блок, муҳандисии худӣ ва ҳама чиз дар наздикии хона.",
    } satisfies Localized,
    visit: { ru: "Личная встреча", tg: "Вохӯрии шахсӣ" } satisfies Localized,
    visitText: {
      ru: "Приезжайте на объект — покажем генплан, планировки и ход строительства.",
      tg: "Ба объект биёед — нақша, тарҳбандӣ ва рафти сохтмонро нишон медиҳем.",
    } satisfies Localized,
    managerLogin: {
      ru: "Вход для менеджеров",
      tg: "Воридшавӣ барои менеҷерон",
    } satisfies Localized,
  },

  feedback: {
    title: { ru: "Предложение или жалоба", tg: "Пешниҳод ё шикоят" } satisfies Localized,
    text: {
      ru: "Мы читаем каждое обращение. Выберите удобный способ связи.",
    } satisfies Localized,
    channels: { call: "Позвонить", whatsapp: "WhatsApp", telegram: "Telegram" },
  },

  seo: {
    title: {
      ru: "Жилой комплекс «Зарафшон» — Айнинский район",
      tg: "Маҷмааи истиқоматии Зарафшон — ноҳияи Айнӣ",
    } satisfies Localized,
    description: {
      ru: "2 жилых блока по 9 этажей в Айнинском районе Согдийской области, 100 км от Душанбе: квартиры от 42 до 103 м², магазины на первом этаже, детский сад, солнечные панели и собственная котельная. Выбор квартиры онлайн.",
    } satisfies Localized,
  },
} as const;
