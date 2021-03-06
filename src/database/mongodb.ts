import mongoose from 'mongoose';
import { Database, DatabaseFilter, DatabaseFilterOperator, DatabaseGetManyOptions, DatabaseSorter, Field, Model } from '../definitions';
const dbTypeMap = {
    string: String,
    number: Number,
    boolean: Boolean,
};

export default async (connectionString: any, modelInput: Model[]) : Promise<Database> => {
    // @ts-ignore (configuration is already validated)
    await mongoose.connect(connectionString);
    let models : { [key: string]: mongoose.Model<any> } = {};
    modelInput.forEach((model: Model) => {
        const schemaObject = model.fields.reduce((acc: any, field: Field) => {
            // @ts-ignore
            acc[field.name] = dbTypeMap[field.type];
            return acc;
        }, {});
        const schema = new mongoose.Schema(schemaObject, { versionKey: false });
        models[model.name] = mongoose.model(model.name, schema);
    });
    return {
        tryGetById(modelName: string, id: string) {
            const isValidId = mongoose.isValidObjectId(id);
            if(!isValidId) {
                return null;
            }
            return models[modelName].findById(id);
        },
        getMany(modelName: string, options: DatabaseGetManyOptions) {
            const mongodbFilter = options.filters.reduce((acc: any, current: DatabaseFilter) => {
                if(current.operator === DatabaseFilterOperator.EQUAL) {
                    acc[current.key] = current.value;
                    return acc;
                }
                else if(current.operator === DatabaseFilterOperator.LIKE) {
                    acc[current.key] = { $regex: `.*${current.value}.*` };
                }
                else if(current.operator === DatabaseFilterOperator.NOTEQUAL) {
                    acc[current.key] = { $ne: current.value };
                }
                else if(current.operator === DatabaseFilterOperator.GREATER) {
                    acc[current.key] = { $gt: current.value };
                }
                else if(current.operator === DatabaseFilterOperator.GREATEROREQUAL) {
                    acc[current.key] = { $gte: current.value };
                }
                else if(current.operator === DatabaseFilterOperator.LESS) {
                    acc[current.key] = { $lt: current.value };
                }
                else if(current.operator === DatabaseFilterOperator.LESSOREQUAL) {
                    acc[current.key] = { $lte: current.value };
                }
                else if(current.operator === DatabaseFilterOperator.IN) {
                    acc[current.key] = { $in: current.value };
                }
                else if(current.operator === DatabaseFilterOperator.NOTIN) {
                    acc[current.key] = { $nin: current.value };
                }
                return acc;
            }, {});
            let query = models[modelName].find(mongodbFilter);
            if(options.sorters.length) {
                const mongodbSorter = options.sorters.reduce((acc: any, current: DatabaseSorter) => {
                    acc[current.fieldName] = current.sortDirection;
                    return acc;
                }, {});
                query = query.sort(mongodbSorter);
            }
            if(options._limit) query = query.limit(options._limit);
            if(options._skip) query = query.skip(options._skip);
            return query;
        },
        create(modelName: string, data: any) {
            return models[modelName].create(data);
        },
        tryUpdate(modelName: string, id: string, data: any) {
            const isValidId = mongoose.isValidObjectId(id);
            if(!isValidId) {
                return null;
            }
            return models[modelName].findByIdAndUpdate(id, data, { new: true });
        },
        update(modelName: string, id: string, data: any) {
            const isValidId = mongoose.isValidObjectId(id);
            if(!isValidId) {
                return null;
            }
            return models[modelName].findByIdAndUpdate(id, { ...data, _id: id }, { new: true, upsert: true, overwrite: true });
        },
        tryDelete(modelName: string, id: string) {
            const isValidId = mongoose.isValidObjectId(id);
            if(!isValidId) {
                return null;
            }
            return models[modelName].findByIdAndDelete(id);
        },
    };
};