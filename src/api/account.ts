import { abortIfNeeded, currentProfile, mutate, nextId, readState, recordEvent } from "../demo/store";

export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  role: "customer" | "staff";
};

export type AccountAddress = {
  id: string;
  label: string;
  recipientName: string;
  lineOne: string;
  lineTwo: string | null;
  city: string;
  postalCode: string;
  isDefault: number;
};

export type AccountSecurityEvent = {
  id: number;
  eventType: string;
  summary: string;
  addressId: string | null;
  occurredAt: string;
};

export async function fetchSession(signal?: AbortSignal): Promise<AccountUser | null> {
  abortIfNeeded(signal);
  const state = readState();
  return state.profiles.find((p) => p.user.id === state.sessionId)?.user ?? null;
}

// Password fields are presentation props: their contents are never saved or sent.
export async function login(email: string, _password: string): Promise<AccountUser> {
  return mutate((state) => {
    const profile = state.profiles.find((p) => p.user.email === email.trim().toLowerCase());
    if (!profile) throw new Error("Demo müştəri və ya Demo Studio düyməsini seç.");
    state.sessionId = profile.user.id;
    recordEvent(state, "Demo hesabına giriş edildi.");
    return profile.user;
  });
}

export async function register(displayName: string, email: string, _password: string): Promise<AccountUser> {
  return mutate((state) => {
    if (displayName.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Ad və email məlumatlarını yoxla.");
    if (state.profiles.some((p) => p.user.email === email.trim().toLowerCase())) throw new Error("Bu demo hesabı artıq var.");
    const user: AccountUser = { id: nextId(state, "customer"), displayName: displayName.trim(), email: email.trim().toLowerCase(), role: "customer" };
    state.profiles.push({ user, addresses: [], orders: [], events: [], usedCoupons: [] });
    state.sessionId = user.id;
    recordEvent(state, "Demo profili yaradıldı.");
    return user;
  });
}

export async function logout(): Promise<void> { mutate((state) => { state.sessionId = null; state.cart = []; }); }
export async function fetchAddresses(): Promise<AccountAddress[]> { return currentProfile().addresses; }
export async function fetchSecurityEvents(): Promise<AccountSecurityEvent[]> { return currentProfile().events; }
export async function updateProfile(displayName: string): Promise<AccountUser> {
  return mutate((state) => {
    if (displayName.trim().length < 2 || displayName.trim().length > 60) throw new Error("Adı yoxla.");
    const profile = currentProfile(state);
    profile.user.displayName = displayName.trim();
    return profile.user;
  });
}
export async function setDefaultAddress(addressId: string): Promise<void> {
  mutate((state) => {
    const profile = currentProfile(state);
    if (!profile.addresses.some((a) => a.id === addressId)) throw new Error("Ünvan tapılmadı.");
    profile.addresses.forEach((a) => { a.isDefault = Number(a.id === addressId); });
    recordEvent(state, "Əsas ünvan dəyişdirildi.", addressId);
  });
}
export async function requestPasswordRecovery(_email: string): Promise<void> {
  // No email, token, or credential service exists in this static demonstration.
}
export async function resetPassword(_token: string, _password: string): Promise<void> {
  mutate((state) => { state.sessionId = null; });
}
export async function changePassword(_currentPassword: string, _newPassword: string): Promise<void> {
  mutate((state) => { recordEvent(state, `Şifrə dəyişmə ekranı sınaqdan keçirildi. Real şifrə saxlanmır.`); });
}
