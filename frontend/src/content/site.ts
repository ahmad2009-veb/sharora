/**
 * Static content of the public site. The home page is fully static (SSG) and reads
 * only from this file — it never calls the API.
 *
 * Every user-facing string is a `Localized` value with both Russian and Tajik text —
 * the type makes a missing translation a compile error.
 */
import type { Locale } from "@/i18n/routing";

export type Localized = { ru: string; tg: string };

export function tr(value: Localized, locale: Locale): string {
  return value[locale];
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
    project: { ru: "ЖК «Зеравшан»", tg: "МИ «Зарафшон»" } satisfies Localized,
    logo: "/logo.png",
    // Header/footer logo text: wordmark (Latin in both languages) and the slogan under it.
    wordmark: "Vasli Tojik",
    tagline: { ru: "Строим ваше будущее", tg: "Бунёди фардои шумо" } satisfies Localized,
  },

  contact: {
    // The one company number: header, footer, hero, tab bar, sheets and modals all read it here.
    phoneDisplay: "+992 300 00 00 59",
    phoneHref: "tel:+992300000059",
    phoneNote: {
      ru: "Ответственное лицо — звоните для связи",
      tg: "Шахси масъул — барои тамос занг занед",
    } satisfies Localized,
    // Messengers: change the number / username here only — links are built from these.
    whatsappNumber: "992300000059",
    whatsapp: "https://wa.me/992300000059",
    telegram: "https://t.me/+992300000059",
    hours: { ru: "Пн–Сб, 9:00–18:00", tg: "Дш–Шн, 9:00–18:00" } satisfies Localized,
    greeting: {
      ru: "Здравствуйте! Хочу узнать о квартирах в ЖК «Зеравшан».",
      tg: "Ассалому алейкум! Мехоҳам дар бораи хонаҳои МИ «Зарафшон» маълумот гирам.",
    } satisfies Localized,
    /** `{unit}` → "Квартира 2, Блок 1, Этаж 2, 75.00 м²" */
    unitGreeting: {
      ru: "Здравствуйте! Интересует {unit}.",
      tg: "Ассалому алейкум! Ман ба {unit} шавқ дорам.",
    } satisfies Localized,
    // TODO(client): add the street once known.
    address: {
      ru: "Согдийская область, Айнинский район, пос. Зарафшан",
      tg: "Вилояти Суғд, ноҳияи Айнӣ, шаҳраки Зарафшон",
    } satisfies Localized,
    distance: { ru: "100 км от Душанбе", tg: "100 км аз Душанбе" } satisfies Localized,
    // TODO(client): pin the exact construction site in Zarafshan; this is the centre of Ayni.
    map: { lat: 39.39, lon: 68.54 },
  },

  nav: [
    { href: "/", label: { ru: "Главная", tg: "Асосӣ" } },
    { href: "/#about", label: { ru: "О проекте", tg: "Дар бораи лоиҳа" } },
    { href: "/#features", label: { ru: "Преимущества", tg: "Бартариятҳо" } },
    { href: "/#interior", label: { ru: "Архитектура", tg: "Меъморӣ" } },
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
    eyebrow: {
      ru: "Zarafshon Sokhtmon · Зеравшан",
      tg: "Zarafshon Sokhtmon · Зарафшон",
    } satisfies Localized,
    badge: {
      ru: "Новый жилой комплекс · 100 км от Душанбе",
      tg: "Маҷмааи нави истиқоматӣ · 100 км аз Душанбе",
    } satisfies Localized,
    titleLines: [
      { ru: "Жилой комплекс", tg: "Маҷмааи истиқоматии" },
      { ru: "«Зеравшан»", tg: "«Зарафшон»" },
    ] satisfies Localized[],
    salesNote: {
      ru: "Открыты продажи — 2 блока",
      tg: "Фурӯш кушода аст — 2 блок",
    } satisfies Localized,
    title: {
      ru: "Жилой комплекс «Зеравшан»",
      tg: "Маҷмааи истиқоматии «Зарафшон»",
    } satisfies Localized,
    subtitle: {
      ru: "Широкие дороги, магазины на первом этаже и всё необходимое для комфортной современной жизни.",
      tg: "Роҳҳои васеъ, мағозаҳо дар ошёнаи якум ва ҳама чизи зарурӣ барои зиндагии бароҳат ва муосир.",
    } satisfies Localized,
    imageAlt: {
      ru: "Вид на жилой дом комплекса «Зеравшан» с коммерческими помещениями на первом этаже",
      tg: "Намуди бинои истиқоматии маҷмааи «Зарафшон» бо биноҳои тиҷоратӣ дар ошёнаи якум",
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
        // A word instead of a number: shown in the big figure style, without a label.
        value: { ru: "Детский сад", tg: "Кӯдакистон" },
        text: { ru: "Детский сад рядом с комплексом", tg: "Боғчаи бачагона дар наздикии маҷмаа" },
      },
    ] satisfies { value: string | Localized; label?: Localized; text: Localized }[],
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
        tg: "Маҷмааи муосири истиқоматӣ дар ноҳияи Айнӣ аз 2 блоки 9-ошёна иборат аст, ки барои зиндагии бароҳат ва муосир сохта мешаванд.",
      },
      {
        ru: "На первом этаже расположатся магазины и объекты сферы услуг, чтобы всё необходимое было рядом с вашим домом.",
        tg: "Дар ошёнаи якум мағозаҳо ва иншооти хизматрасонӣ ҷойгир мешаванд, то ҳама чизи зарурӣ дар наздикии хонаи шумо бошад.",
      },
      {
        ru: "Это не просто жилой комплекс — это пространство для комфортной жизни, безопасности и уверенного будущего.",
        tg: "Ин на танҳо маҷмааи истиқоматӣ, балки фазои зиндагии бароҳат, бехатарӣ ва ояндаи боэътимод аст.",
      },
    ] satisfies Localized[],
    image: "/renders/about-aerial.jpg",
    imageAlt: {
      ru: "Вид сверху на два 9-этажных блока комплекса «Зеравшан» с солнечными панелями на крыше",
      tg: "Намои болоӣ ба ду блоки 9-ошёнаи маҷмааи «Зарафшон» бо панелҳои офтобӣ дар бом",
    } satisfies Localized,
    developerLabel: { ru: "Застройщик", tg: "Сохтмончӣ" } satisfies Localized,
    developerName: { ru: "Vasli Tojik", tg: "Vasli Tojik" } satisfies Localized,
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
      tg: "Ду блоки 9-ошёна: дар ошёнаи якум мағозаҳо, дар ошёнаҳои 2–9 ҳар кадом 7 хона. Блокро интихоб кунед — интихоби ошёна ва хона кушода мешавад.",
    } satisfies Localized,
    // Phones and devices without WebGL get this render with two block buttons instead of 3D.
    fallbackImage: "/renders/gallery/07-aerial.jpg",
    fallbackAlt: {
      ru: "Жилой комплекс «Зеравшан»: Блок 1 и Блок 2",
      tg: "Маҷмааи истиқоматии «Зарафшон»: Блоки 1 ва Блоки 2",
    } satisfies Localized,
    blocks: [{ letter: "1" }, { letter: "2" }],
    blockLabel: { ru: "Блок", tg: "Блоки" } satisfies Localized,
    selected: { ru: "Выбранный блок", tg: "Блоки интихобшуда" } satisfies Localized,
    onSale: { ru: "В продаже", tg: "Дар фурӯш" } satisfies Localized,
    soldOut: { ru: "Всё продано", tg: "Ҳама фурӯхта шуд" } satisfies Localized,
    freeLabel: { ru: "Свободно", tg: "Озод" } satisfies Localized,
    floorsLabel: { ru: "Этажей", tg: "Ошёнаҳо" } satisfies Localized,
    areaLabel: { ru: "Площади", tg: "Масоҳатҳо" } satisfies Localized,
    soldLabel: { ru: "Продано", tg: "Фурӯхта шуд" } satisfies Localized,
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
    title: {
      ru: "Продумано до инженерных сетей",
      tg: "Ҳама чиз то шабакаҳои муҳандисӣ андешида шудааст",
    } satisfies Localized,
    subtitle: {
      ru: "Своя энергия и тепло — комплекс не зависит от городских перебоев.",
      tg: "Барқ ва гармии худӣ — маҷмаа аз қатъшавиҳои шаҳрӣ вобаста нест.",
    } satisfies Localized,
    items: [
      {
        icon: "sun",
        title: {
          ru: "Солнечная энергия — шаг в будущее",
          tg: "Энергияи офтобӣ — қадам ба сӯи оянда",
        },
        text: {
          ru: "На крыше комплекса будут установлены солнечные панели, обеспечивающие электроэнергией лифты, внутреннее и наружное освещение и другие коммунальные системы — энергоэффективность и экологичность.",
          tg: "Дар боми маҷмаа панелҳои офтобӣ насб карда мешаванд, ки лифтҳо, равшании дохилӣ ва берунӣ ва дигар системаҳои коммуналиро бо барқ таъмин мекунанд — сарфаи энергия ва тозагии муҳити зист.",
        },
      },
      {
        icon: "flame",
        title: { ru: "Центральная система отопления", tg: "Системаи марказии гармидиҳӣ" },
        text: {
          ru: "Собственная котельная на территории: по современной инженерной сети теплоноситель подаётся в каждую квартиру — стабильное и эффективное отопление.",
          tg: "Дегхонаи худӣ дар ҳудуди маҷмаа: гармӣ тавассути шабакаи муосири муҳандисӣ ба ҳар як хона мерасад — гармидиҳии устувор ва самаранок.",
        },
      },
      {
        icon: "baby",
        title: { ru: "Детская площадка", tg: "Майдончаи бачагона" },
        text: {
          ru: "Современная безопасная площадка для игр, активного отдыха и развития детей.",
          tg: "Майдончаи муосир ва бехатар барои бозӣ, истироҳати фаъол ва рушди кӯдакон.",
        },
      },
      {
        icon: "mapPin",
        title: { ru: "100 км от Душанбе", tg: "100 км аз Душанбе" },
        text: {
          ru: "Айнинский район Согдийской области — спокойная атмосфера вдали от городского шума.",
          tg: "Ноҳияи Айнии вилояти Суғд — фазои ором дур аз ғавғои шаҳр.",
        },
      },
      {
        icon: "store",
        title: { ru: "Торговые и сервисные центры", tg: "Марказҳои савдо ва хизматрасонӣ" },
        text: {
          ru: "Магазины и услуги на первом этаже — всё рядом с домом.",
          tg: "Мағозаҳо ва хизматрасониҳо дар ошёнаи якум — ҳама чиз дар наздикии хона.",
        },
      },
      {
        icon: "school",
        title: { ru: "Детский сад", tg: "Боғчаи бачагона" },
        text: {
          ru: "Рядом с комплексом — безопасная среда для воспитания, обучения и развития детей.",
          tg: "Дар наздикии маҷмаа — муҳити бехатар барои тарбия, таълим ва рушди кӯдакон.",
        },
      },
    ] satisfies {
      icon: FeatureIcon;
      title: Localized;
      text: Localized;
    }[],
    closing: {
      ru: "Это не просто жилой комплекс — это новое пространство для жизни, комфорта и будущего.",
      tg: "Ин на танҳо маҷмааи истиқоматӣ, балки фазои нав барои зиндагӣ, роҳат ва оянда аст.",
    } satisfies Localized,
  },

  interior: {
    eyebrow: { ru: "Архитектура", tg: "Меъморӣ" } satisfies Localized,
    title: {
      ru: "Пространство, в котором хочется жить",
      tg: "Фазое, ки дар он зиндагӣ кардан мехоҳед",
    } satisfies Localized,
    subtitle: {
      ru: "Визуализации фасадов, двора и территории комплекса.",
      tg: "Тасвирҳои намо, ҳавлӣ ва ҳудуди маҷмаа.",
    } satisfies Localized,
    images: [
      {
        src: "/renders/gallery/01-corner-day.jpg",
        tag: { ru: "Фасад", tg: "Намо" },
        alt: {
          ru: "Жилой дом комплекса с магазинами на первом этаже",
          tg: "Бинои истиқоматии маҷмаа бо мағозаҳо дар ошёнаи якум",
        },
      },
      {
        src: "/renders/gallery/02-corner-evening.jpg",
        tag: { ru: "Вечер", tg: "Бегоҳ" },
        alt: {
          ru: "Комплекс вечером с архитектурной подсветкой",
          tg: "Маҷмаа бегоҳӣ бо равшании меъморӣ",
        },
      },
      {
        src: "/renders/gallery/03-facade-day.jpg",
        tag: { ru: "Фасад", tg: "Намо" },
        alt: { ru: "Главный фасад днём", tg: "Намои асосӣ дар рӯз" },
      },
      {
        src: "/renders/gallery/04-facade-night.jpg",
        tag: { ru: "Вечер", tg: "Бегоҳ" },
        alt: { ru: "Главный фасад в сумерках", tg: "Намои асосӣ дар шом" },
      },
      {
        src: "/renders/gallery/05-shops.jpg",
        tag: { ru: "Магазины", tg: "Мағозаҳо" },
        alt: {
          ru: "Коммерческие помещения на первом этаже",
          tg: "Биноҳои тиҷоратӣ дар ошёнаи якум",
        },
      },
      {
        src: "/renders/gallery/06-playground.jpg",
        tag: { ru: "Двор", tg: "Ҳавлӣ" },
        alt: {
          ru: "Детская площадка, футбольное поле и парковка",
          tg: "Майдончаи бачагона, майдони футбол ва таваққуфгоҳ",
        },
      },
      {
        src: "/renders/gallery/07-aerial.jpg",
        tag: { ru: "Вид сверху", tg: "Намои болоӣ" },
        alt: {
          ru: "Два блока с солнечными панелями на крыше",
          tg: "Ду блок бо панелҳои офтобӣ дар бом",
        },
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
        title: { ru: "Постановление председателя района", tg: "Қарори раиси ноҳия" },
        pages: 1,
      },
      { slug: "vakolatnoma", title: { ru: "Доверенность", tg: "Ваколатнома" }, pages: 5 },
      {
        slug: "ijozatnoma-barq",
        title: { ru: "Разрешение на электроснабжение", tg: "Иҷозатнома барои барқ" },
        pages: 1,
      },
      {
        slug: "ariza",
        title: { ru: "Заявление на разрешение", tg: "Ариза барои иҷозатнома" },
        pages: 1,
      },
      {
        slug: "shahodatnoma",
        title: { ru: "Свидетельство проекта", tg: "Шаҳодатномаи лоиҳа" },
        pages: 2,
      },
      {
        slug: "xulosa",
        title: { ru: "Заключение экспертизы", tg: "Хулосаи экспертиза" },
        pages: 2,
      },
    ] satisfies { slug: string; title: Localized; pages: number }[],
  },

  location: {
    eyebrow: { ru: "Расположение", tg: "Ҷойгиршавӣ" } satisfies Localized,
    title: { ru: "Айнинский район", tg: "Ноҳияи Айнӣ" } satisfies Localized,
    text: {
      ru: "Комплекс находится в Айнинском районе Согдийской области, в 100 км от Душанбе.",
      tg: "Маҷмаа дар ноҳияи Айнии вилояти Суғд, 100 км дуртар аз Душанбе ҷойгир аст.",
    } satisfies Localized,
    route: { ru: "Построить маршрут", tg: "Масир сохтан" } satisfies Localized,
    mapTitle: {
      ru: "Карта расположения ЖК «Зеравшан»",
      tg: "Харитаи ҷойгиршавии МИ «Зарафшон»",
    } satisfies Localized,
    pinLabel: { ru: "ЖК «Зеравшан»", tg: "МИ «Зарафшон»" } satisfies Localized,
    routeNote: {
      ru: "100 км от Душанбе",
      tg: "100 км аз Душанбе",
    } satisfies Localized,
  },

  cta: {
    badge: { ru: "Персональная консультация", tg: "Машварати шахсӣ" } satisfies Localized,
    title: {
      ru: "Найдите свою квартиру в ЖК «Зеравшан»",
      tg: "Хонаи худро дар МИ «Зарафшон» ёбед",
    } satisfies Localized,
    text: {
      ru: "Выберите блок, этаж и планировку онлайн — или оставьте номер, и менеджер подберёт варианты и расскажет об условиях рассрочки.",
      tg: "Блок, ошёна ва тарҳбандиро онлайн интихоб кунед — ё рақами худро гузоред, менеҷер вариантҳоро пешниҳод карда, дар бораи шартҳои насия маълумот медиҳад.",
    } satisfies Localized,
    points: [
      { ru: "Рассрочка от застройщика без банка", tg: "Насия аз сохтмончӣ бе бонк" },
      {
        ru: "Свободные квартиры и цены — в реальном времени",
        tg: "Хонаҳои озод ва нархҳо — дар вақти воқеӣ",
      },
      { ru: "Документы проекта в открытом доступе", tg: "Ҳуҷҷатҳои лоиҳа дар дастрасии озод" },
    ] satisfies Localized[],
    formTitle: { ru: "Заявка на консультацию", tg: "Дархост барои машварат" } satisfies Localized,
    formText: {
      ru: "Менеджер перезвонит в рабочее время",
      tg: "Менеҷер дар вақти корӣ занг мезанад",
    } satisfies Localized,
    roomsLabel: { ru: "Интересует", tg: "Ба ман лозим аст" } satisfies Localized,
    roomOptions: [
      { value: "1", label: { ru: "1-комн.", tg: "1-ҳуҷрагӣ" } },
      { value: "2", label: { ru: "2-комн.", tg: "2-ҳуҷрагӣ" } },
      { value: "3", label: { ru: "3-комн.", tg: "3-ҳуҷрагӣ" } },
      { value: "4", label: { ru: "4-комн.", tg: "4-ҳуҷрагӣ" } },
      { value: "shop", label: { ru: "Коммерция", tg: "Тиҷоратӣ" } },
    ] satisfies { value: string; label: Localized }[],
    browse: { ru: "Смотреть все квартиры", tg: "Ҳамаи хонаҳоро дидан" } satisfies Localized,
  },

  footer: {
    rights: {
      ru: "© 2026 Vasli Tojik. Все права защищены.",
      tg: "© 2026 Vasli Tojik. Ҳамаи ҳуқуқҳо ҳифз шудаанд.",
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
      tg: "Мо ҳар як муроҷиатро мехонем. Роҳи қулайи тамосро интихоб кунед.",
    } satisfies Localized,
    channels: {
      call: { ru: "Позвонить", tg: "Занг задан" },
      whatsapp: { ru: "WhatsApp", tg: "WhatsApp" },
      telegram: { ru: "Telegram", tg: "Telegram" },
    } satisfies Record<string, Localized>,
  },

  /** Lead texts from the calculator — read by managers, so always Russian. */
  calculatorLead: {
    name: "Расчёт рассрочки",
    message: (v: { area: string; total: string; down: string; term: number; monthly: string }) =>
      `Калькулятор: ${v.area} м², стоимость ${v.total}, взнос ${v.down}, срок ${v.term} мес., платёж ${v.monthly}/мес.`,
  },

  seo: {
    title: {
      ru: "Жилой комплекс «Зеравшан» — Айнинский район",
      tg: "Маҷмааи истиқоматии «Зарафшон» — ноҳияи Айнӣ",
    } satisfies Localized,
    description: {
      ru: "2 жилых блока по 9 этажей в Айнинском районе Согдийской области, 100 км от Душанбе: квартиры от 42 до 103 м², магазины на первом этаже, детский сад рядом, солнечные панели и собственная котельная. Выбор квартиры онлайн.",
      tg: "2 блоки истиқоматии 9-ошёна дар ноҳияи Айнии вилояти Суғд, 100 км аз Душанбе: хонаҳо аз 42 то 103 м², мағозаҳо дар ошёнаи якум, боғчаи бачагона дар наздикӣ, панелҳои офтобӣ ва дегхонаи худӣ. Интихоби хона онлайн.",
    } satisfies Localized,
  },
} as const;
