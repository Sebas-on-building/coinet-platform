import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui';

const CoiNetToolbar = () => {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger>
          <button>Tool 1</button>
        </TooltipTrigger>
        <TooltipContent>
          Tool 1 Description
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <button>Tool 2</button>
        </TooltipTrigger>
        <TooltipContent>
          Tool 2 Description
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default CoiNetToolbar; 