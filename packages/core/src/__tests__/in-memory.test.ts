import { InMemoryStore } from "../memory";
import { memoryStoreContractTests } from "./contract";

memoryStoreContractTests(() => new InMemoryStore());
