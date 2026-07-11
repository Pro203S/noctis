export default function usNow() {
    if (global.process && "hrtime" in process) {
        const hr = process.hrtime();
        return (hr[0] * 1e9 + hr[1]) / 1e3;
    }

    return Date.now() * 1e3;
}