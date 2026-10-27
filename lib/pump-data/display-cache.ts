// Display caching is optional. Never use this for a financial journal write.
export async function cacheDisplayResult<T>(value:T,write:(value:T)=>Promise<unknown>):Promise<T>{
 try{await write(value);}catch{/* Fresh validated source data remains displayable when Redis is unavailable. */}
 return value;
}
