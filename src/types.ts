/**
 * Server Config.
 */
export type NoctisConfig = Partial<{
    "https": {
        "keyPath": string,
        "certPath": string
    },
    "port": number
}>;
