let closingPromise: Promise<void> | null = null

export const connectDb = async (): Promise<void> =>{
    if(closingPromise){
        throw new Error('mongodb connection is closing')
    }
}