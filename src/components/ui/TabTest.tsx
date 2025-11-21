"use client";

import React from "react";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/Card";

export function TabTest() {
  return (
    <div className="p-4">
      <Tabs defaultValue="tab1" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>

        <TabsContent value="tab1" className="space-y-4">
          <Card className="p-4">
            <h3>Content for Tab 1</h3>
            <p>This is test content for tab 1</p>
          </Card>
        </TabsContent>

        <TabsContent value="tab2" className="space-y-4">
          <Card className="p-4">
            <h3>Content for Tab 2</h3>
            <p>This is test content for tab 2</p>
          </Card>
        </TabsContent>

        <TabsContent value="tab3" className="space-y-4">
          <Card className="p-4">
            <h3>Content for Tab 3</h3>
            <p>This is test content for tab 3</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
