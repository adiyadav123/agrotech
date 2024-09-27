import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

const MidWidget = ({title, description}) => {
  return (
    <div>
      <div className="h-[100px] w-[200px] cursor-pointer">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardFooter>
            <p className="name">Agrotech</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default MidWidget;
