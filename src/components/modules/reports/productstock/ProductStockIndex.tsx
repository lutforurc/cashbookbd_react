import { useSelector } from "react-redux";
import ProductStock from "./ProductStock";
import ProductStockNormal from "./ProductStockNormal";

const ProductStockIndex = ( user : any) => {
    const settings = useSelector((state: any) => state.settings);
    const stockReportType = settings?.data?.branch?.stock_report_type;

    if (String(stockReportType) === "1") {
        return <ProductStock user={user} />;
    }

    return <ProductStockNormal user={user} />;

};

export default ProductStockIndex;
