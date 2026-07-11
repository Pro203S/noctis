export default function isJson(value: string): value is any {
    try {
        JSON.parse(value);
        return true;
    } catch (err) {
        return false;
    }
}