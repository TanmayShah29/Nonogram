export const isMob = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width:600px)').matches;
};

export const safeSessionSave = (key: string, value: string) => {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (e) {
        return false;
    }
};

export const safeSessionLoad = (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
        return sessionStorage.getItem(key);
    } catch (e) {
        return null;
    }
};

export const DIFF_COLORS = ['#4caf88', '#4caf88', '#f9c74f', '#f4845f', '#c26b3a'];
export const DIFF_NAMES = ['Sketch', 'Simple', 'Balanced', 'Crisp', 'Ultra'];
export const DIFF_TAGS = ['Easy', 'Easy', 'Medium', 'Hard', 'Expert'];

