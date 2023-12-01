import { Button, styled } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ChangeEvent, ElementType } from 'react';

interface UploadButton {
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    className: string;
    accept: string;
    rootNode: ElementType<any>;
    id: string;
    disabled?: boolean;
    disabledButton?: boolean;
    label: string;
    multiple?: boolean;
}

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 100,
});

const UploadButton = ({
    onChange,
    accept,
    rootNode,
    id,
    className,
    disabled,
    disabledButton,
    label,
    multiple = false,
}: UploadButton) => {
    return (
        <Button
            className={className}
            component={rootNode}
            variant="contained"
            startIcon={<CloudUploadIcon />}
            disabled={disabledButton}
        >
            {label}
            <VisuallyHiddenInput
                type="file"
                multiple={multiple}
                onChange={onChange}
                accept={accept}
                id={id}
                disabled={disabled}
            />
        </Button>
    );
};

export default UploadButton;
