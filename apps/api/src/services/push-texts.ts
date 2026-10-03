import type { Lang } from '../i18n.js';

/** Push notification copy in each supported language. */
const TEXTS = {
  en: {
    duelInvite: (name: string) => ({ title: `${name} challenged you`, body: 'Accept the duel and see who explores more.' }),
    duelAccepted: (name: string) => ({ title: `${name} accepted your challenge`, body: 'The duel has started. Good luck!' }),
    newFollower: (name: string) => ({ title: 'New follower', body: `${name} started following you` }),
    comment: (name: string, body: string) => ({ title: `${name} commented`, body }),
    friendCompleted: (name: string, challenge: string) => ({ title: `${name} completed a challenge`, body: challenge }),
    streak: (days: number) => ({
      title: `Keep your ${days}-day streak`,
      body: 'Complete any challenge before midnight to keep it going.',
    }),
    goalEnding: (goal: string, current: number, target: number, xp: number) => ({
      title: `${goal} ends tomorrow`,
      body: `You're at ${current}/${target}. Finish it for +${xp} XP.`,
    }),
    levelClose: (missing: number, level: number) => ({
      title: `${missing} XP to Level ${level}`,
      body: 'One more challenge should do it.',
    }),
  },
  lv: {
    duelInvite: (name: string) => ({ title: `${name} tevi izaicināja`, body: 'Pieņem dueli un noskaidro, kurš ceļo vairāk.' }),
    duelAccepted: (name: string) => ({ title: `${name} pieņēma tavu izaicinājumu`, body: 'Duelis ir sācies. Veiksmi!' }),
    newFollower: (name: string) => ({ title: 'Jauns sekotājs', body: `${name} sāka tev sekot` }),
    comment: (name: string, body: string) => ({ title: `${name} komentēja`, body }),
    friendCompleted: (name: string, challenge: string) => ({ title: `${name} izpildīja izaicinājumu`, body: challenge }),
    streak: (days: number) => ({
      title: `Saglabā savu ${days} dienu sēriju`,
      body: 'Izpildi jebkuru izaicinājumu līdz pusnaktij, lai to turpinātu.',
    }),
    goalEnding: (goal: string, current: number, target: number, xp: number) => ({
      title: `${goal} beidzas rīt`,
      body: `Tev ir ${current}/${target}. Pabeidz un saņem +${xp} XP.`,
    }),
    levelClose: (missing: number, level: number) => ({
      title: `${missing} XP līdz ${level}. līmenim`,
      body: 'Vēl viens izaicinājums – un esi klāt.',
    }),
  },
  ru: {
    duelInvite: (name: string) => ({ title: `${name} бросил вам вызов`, body: 'Примите дуэль и узнайте, кто исследует больше.' }),
    duelAccepted: (name: string) => ({ title: `${name} принял ваш вызов`, body: 'Дуэль началась. Удачи!' }),
    newFollower: (name: string) => ({ title: 'Новый подписчик', body: `${name} подписался на вас` }),
    comment: (name: string, body: string) => ({ title: `${name} оставил комментарий`, body }),
    friendCompleted: (name: string, challenge: string) => ({ title: `${name} выполнил задание`, body: challenge }),
    streak: (days: number) => ({
      title: `Сохраните серию (${days} дн.)`,
      body: 'Выполните любое задание до полуночи, чтобы продолжить серию.',
    }),
    goalEnding: (goal: string, current: number, target: number, xp: number) => ({
      title: `«${goal}» заканчивается завтра`,
      body: `Ваш прогресс: ${current}/${target}. Завершите и получите +${xp} XP.`,
    }),
    levelClose: (missing: number, level: number) => ({
      title: `${missing} XP до уровня ${level}`,
      body: 'Ещё одно задание — и готово.',
    }),
  },
} satisfies Record<Lang, unknown>;

export function pushTexts(lang: string) {
  return lang === 'lv' || lang === 'ru' ? TEXTS[lang] : TEXTS.en;
}
