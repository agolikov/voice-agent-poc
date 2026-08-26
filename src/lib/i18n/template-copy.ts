import type { UiLocale } from "~/lib/i18n/locale";
import type { TemplateSummary } from "~/lib/voice/types";

type TemplateCopy = Pick<TemplateSummary, "title" | "summary" | "userGoal">;

const pl: Record<string, TemplateCopy> = {
  "airport-check-in": { title: "Odprawa na lotnisku", summary: "Odpraw się na lot z bagażem nieco przekraczającym limit.", userGoal: "Odprawić się, rozwiązać problem nadbagażu i dostać miejsce przy oknie" },
  "asking-directions": { title: "Zagubiony w mieście", summary: "Zapytaj przechodnia o drogę i zrozum wskazówki.", userGoal: "Zatrzymać kogoś, uzyskać wskazówki, upewnić się, że są zrozumiałe, i sprawdzić czas dojścia" },
  "bank-account": { title: "Zakładanie konta bankowego", summary: "Załóż konto jako nowy mieszkaniec bez jednego z dokumentów.", userGoal: "Otworzyć rachunek mimo brakującego dokumentu i zrozumieć opłaty" },
  "buying-a-sim": { title: "Kupno karty SIM", summary: "Porównaj dwa nie do końca zrozumiałe plany i wybierz jeden.", userGoal: "Zrozumieć oba plany, zapytać o ukryte warunki i kupić odpowiedni" },
  doctor: { title: "U lekarza", summary: "Opisz uporczywy ból i zrozum plan leczenia.", userGoal: "Dokładnie opisać ból, odpowiedzieć na pytania o historię choroby i zrozumieć plan leczenia" },
  "hotel-check-in": { title: "Problemy przy zameldowaniu", summary: "Podczas meldowania okazuje się, że pokój nie odpowiada rezerwacji.", userGoal: "Zameldować się, rozwiązać problem z pokojem lub uzyskać rekompensatę oraz ustalić szczegóły śniadania i Wi-Fi" },
  "job-interview": { title: "Rozmowa kwalifikacyjna", summary: "Odpowiedz na trudne pytania podczas pierwszego etapu rekrutacji.", userGoal: "Przedstawić się, podać konkretny przykład doświadczenia, odpowiedzieć na pytanie o słabość i zadać własne pytanie" },
  pharmacy: { title: "W aptece", summary: "Opisz objawy farmaceucie i kup odpowiedni preparat.", userGoal: "Wyjaśnić objawy, odpowiedzieć na pytania farmaceuty i otrzymać właściwy preparat" },
  "phone-call-landlord": { title: "Telefon w sprawie zepsutego pieca", summary: "Rozmowa telefoniczna bez gestów i mimiki — najtrudniejszy wariant.", userGoal: "Zgłosić awarię, podkreślić pilność i ustalić konkretny dzień oraz godzinę naprawy" },
  "renting-a-flat": { title: "Oglądanie mieszkania", summary: "Obejrzyj mieszkanie, zadaj niewygodne pytania i negocjuj warunki.", userGoal: "Ustalić, co obejmuje oferta, zgłosić zauważony problem i uzgodnić warunki" },
  restaurant: { title: "Zamawianie kolacji", summary: "Zamów posiłek, zapytaj o nieznaną potrawę i odeślij błędne danie.", userGoal: "Zamówić pełny posiłek, dowiedzieć się, czym jest nieznana potrawa, i rozwiązać problem błędnego zamówienia" },
  "returning-an-item": { title: "Zwrot wadliwego produktu", summary: "Zwróć laptop, który przestał się ładować, bez paragonu.", userGoal: "Uzyskać naprawę, wymianę lub zwrot pieniędzy mimo braku paragonu" },
  "small-talk-party": { title: "Rozmowa na przyjęciu", summary: "Bez scenariusza: podtrzymaj rozmowę z nieznajomą osobą.", userGoal: "Wyjść poza uprzejme powitanie, znaleźć wspólny temat i elegancko zakończyć rozmowę" },
};

const ru: Record<string, TemplateCopy> = {
  "airport-check-in": { title: "Регистрация в аэропорту", summary: "Зарегистрируйтесь на рейс с багажом, немного превышающим норму.", userGoal: "Зарегистрироваться, решить вопрос с перевесом и получить место у окна" },
  "asking-directions": { title: "Заблудиться в городе", summary: "Спросите прохожего, как пройти, и разберитесь в объяснении.", userGoal: "Остановить прохожего, узнать дорогу, проверить понимание и выяснить, хватит ли времени" },
  "bank-account": { title: "Открытие банковского счёта", summary: "Откройте счёт как новый житель без одного из документов.", userGoal: "Открыть текущий счёт несмотря на отсутствующий документ и разобраться в комиссиях" },
  "buying-a-sim": { title: "Покупка SIM-карты", summary: "Сравните два не вполне понятных тарифа и выберите один.", userGoal: "Разобраться в двух тарифах, спросить о скрытых условиях и выбрать подходящий" },
  doctor: { title: "У врача", summary: "Опишите постоянную боль и разберитесь в плане лечения.", userGoal: "Точно описать боль, ответить на вопросы об истории болезни и понять план лечения" },
  "hotel-check-in": { title: "Проблема при заселении", summary: "При заселении выясняется, что номер не соответствует бронированию.", userGoal: "Заселиться, решить проблему с номером или получить компенсацию, а также уточнить завтрак и Wi-Fi" },
  "job-interview": { title: "Собеседование", summary: "Ответьте на сложные вопросы первого этапа собеседования.", userGoal: "Представиться, привести конкретный пример опыта, ответить на вопрос о слабости и задать свой вопрос" },
  pharmacy: { title: "В аптеке", summary: "Опишите симптомы фармацевту и получите подходящее средство.", userGoal: "Объяснить симптомы, ответить на вопросы фармацевта и получить нужное средство" },
  "phone-call-landlord": { title: "Звонок из-за сломанного котла", summary: "Телефонный разговор без мимики и жестов — самый сложный вариант.", userGoal: "Сообщить о поломке, объяснить срочность и договориться о точных дне и времени ремонта" },
  "renting-a-flat": { title: "Просмотр квартиры", summary: "Осмотрите квартиру, задайте неудобные вопросы и обсудите условия.", userGoal: "Узнать, что входит в стоимость, указать на замеченную проблему и согласовать условия" },
  restaurant: { title: "Заказ ужина", summary: "Закажите еду, уточните незнакомое блюдо и верните ошибочный заказ.", userGoal: "Заказать полный ужин, узнать о незнакомом блюде и решить проблему с неправильным заказом" },
  "returning-an-item": { title: "Возврат неисправного товара", summary: "Верните ноутбук, который перестал заряжаться, без чека.", userGoal: "Добиться ремонта, замены или возврата денег несмотря на отсутствие чека" },
  "small-talk-party": { title: "Разговор на вечеринке", summary: "Без сценария: поддержите разговор с незнакомым человеком.", userGoal: "Перейти от приветствия к общей теме и вежливо завершить разговор" },
};

const translations: Record<Exclude<UiLocale, "en">, Record<string, TemplateCopy>> = { pl, ru };

export const localizeTemplate = (template: TemplateSummary, locale: UiLocale): TemplateSummary => {
  if (locale === "en" || template.source !== "library") return template;
  const copy = translations[locale][template.slug];
  return copy ? { ...template, ...copy } : template;
};
