const usNow = typeof process !== "undefined" && typeof process.hrtime === "function"
    ? () => {
        const hr = process.hrtime();
        return (hr[0] * 1e9 + hr[1]) / 1e3;
    }
    : () => Date.now() * 1e3;

export default usNow;
